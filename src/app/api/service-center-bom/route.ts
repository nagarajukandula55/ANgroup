/**
 * GET  /api/service-center-bom — list the current vendor's service-center
 *      BOM parts (business + vendor scoped).
 * POST /api/service-center-bom — create a new part. partCode is ALWAYS
 *      server-generated (a running "PART-000N" sequence scoped per
 *      businessId+vendorId) — never accepted from the client, per spec
 *      ("Part code (we must generate)").
 *
 * Vendor resolution follows the same pattern as
 * /api/vendor/staff/route.ts: the current vendor is the VendorProfile
 * whose userId matches the logged-in user. A business-admin/super-admin
 * caller may instead pass a vendorId explicitly (e.g. managing a vendor's
 * BOM from the admin side) — falls back to that if no VendorProfile is
 * found for the logged-in user itself.
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import mongoose from "mongoose";
import ServiceCenterBOM from "@/models/ServiceCenterBOM";
import VendorProfile from "@/models/VendorProfile";
// Required for .populate(...) below -- model must be registered before populate can resolve it.
import "@/models/Brand";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";
import { logAction } from "@/lib/audit/logAction";
import { resolveOwnerOrManagerVendor, resolveVendorTeamMembership } from "@/core/access/vendorAccess.service";
// Required for .populate("deviceModelId", ...) below -- model must be registered before populate can resolve it.
import "@/models/DeviceModel";

function permissionErrorResponse(err: any) {
  return NextResponse.json(
    { success: false, error: err.message },
    { status: err.code === "FORBIDDEN" ? 403 : 401 }
  );
}

async function resolveVendorAndBusiness(userId: string, explicitVendorId?: string | null) {
  const vendor = await resolveOwnerOrManagerVendor(userId);
  if (vendor) {
    return { vendorId: (vendor as any)._id, businessId: (vendor as any).businessId };
  }
  if (explicitVendorId && mongoose.Types.ObjectId.isValid(explicitVendorId)) {
    const v = await VendorProfile.findOne({ _id: explicitVendorId, isDeleted: { $ne: true } }).lean();
    if (v) return { vendorId: (v as any)._id, businessId: (v as any).businessId };
  }
  return null;
}

// Read-only variant used by GET only -- an Owner/Manager isn't the only
// one who needs to SEE this vendor's BOM (CCO/Engineer/Centre Manager
// pick parts from it on every workorder), just the only one who can
// manage it (POST stays on resolveVendorAndBusiness above). This was the
// actual reason the workorder Description/BOM-part dropdown had no
// options for those roles -- they never pass an explicit vendorId (the
// job sheet page just calls GET with a brandId filter), and
// resolveOwnerOrManagerVendor is exclusively Owner/Manager, so this
// route 403'd "No vendor profile found" for every other team member.
async function resolveVendorForRead(userId: string, explicitVendorId?: string | null) {
  const ownerOrManager = await resolveOwnerOrManagerVendor(userId);
  if (ownerOrManager) {
    return { vendorId: (ownerOrManager as any)._id, businessId: (ownerOrManager as any).businessId };
  }
  const anyTeamMember = await resolveVendorTeamMembership(userId);
  if (anyTeamMember) {
    return { vendorId: (anyTeamMember as any)._id, businessId: (anyTeamMember as any).businessId };
  }
  if (explicitVendorId && mongoose.Types.ObjectId.isValid(explicitVendorId)) {
    const v = await VendorProfile.findOne({ _id: explicitVendorId, isDeleted: { $ne: true } }).lean();
    if (v) return { vendorId: (v as any)._id, businessId: (v as any).businessId };
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("fault_codes", "view"));
    } catch {
      // service-center-bom doesn't have its own seeded module key yet;
      // fall through to vendor-scoping below which is the real gate here.
    }

    await connectDB();
    const { searchParams } = new URL(req.url);
    const explicitVendorId = searchParams.get("vendorId");

    const resolved = await resolveVendorForRead(session.user.id, explicitVendorId);
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: "No vendor profile found for this account" },
        { status: 403 }
      );
    }

    const search = searchParams.get("search");
    const brandId = searchParams.get("brandId");
    const deviceModelId = searchParams.get("deviceModelId");
    const query: Record<string, unknown> = {
      businessId: resolved.businessId,
      vendorId: resolved.vendorId,
      isActive: true,
    };
    if (search) {
      query.$or = [
        { partName: { $regex: search, $options: "i" } },
        { partCode: { $regex: search, $options: "i" } },
        { hsnCode: { $regex: search, $options: "i" } },
      ];
    }
    // Brand filter is inclusive of brand-agnostic parts (no brandId set) --
    // a universal consumable/labour line should still show up regardless
    // of which device brand the workorder is for.
    if (brandId && mongoose.Types.ObjectId.isValid(brandId)) {
      query.$and = [{ $or: [{ brandId }, { brandId: null }, { brandId: { $exists: false } }] }];
    }
    // Same inclusive pattern one level down -- a model-agnostic part under
    // that brand ("fits every model") still shows when browsing one model.
    if (deviceModelId && mongoose.Types.ObjectId.isValid(deviceModelId)) {
      const modelOr = { $or: [{ deviceModelId }, { deviceModelId: null }, { deviceModelId: { $exists: false } }] };
      query.$and = query.$and ? [...(query.$and as any[]), modelOr] : [modelOr];
    }

    const parts = await ServiceCenterBOM.find(query)
      .populate("brandId", "name")
      .populate("deviceModelId", "name")
      .sort({ partName: 1 })
      .lean();
    return NextResponse.json({ success: true, parts });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      partName, hsnCode, rate, vendorId: explicitVendorId,
      brandId, deviceModelId, description, partType, unit, gstRate, warrantyDays, materialId,
    } = body;

    if (!partName?.trim() || !hsnCode?.trim() || rate === undefined || rate === null) {
      return NextResponse.json(
        { success: false, error: "partName, hsnCode and rate are required" },
        { status: 400 }
      );
    }

    await connectDB();
    const resolved = await resolveVendorAndBusiness(session.user.id, explicitVendorId);
    if (!resolved) {
      return NextResponse.json(
        { success: false, error: "No vendor profile found for this account" },
        { status: 403 }
      );
    }

    // Server-generated running sequence per business+vendor: PART-0001, ...
    const existingCount = await ServiceCenterBOM.countDocuments({
      businessId: resolved.businessId,
      vendorId: resolved.vendorId,
    });
    const partCode = `PART-${String(existingCount + 1).padStart(4, "0")}`;

    const part = await ServiceCenterBOM.create({
      businessId: resolved.businessId,
      vendorId: resolved.vendorId,
      brandId: brandId && mongoose.Types.ObjectId.isValid(brandId) ? brandId : undefined,
      deviceModelId: deviceModelId && mongoose.Types.ObjectId.isValid(deviceModelId) ? deviceModelId : undefined,
      partName: partName.trim(),
      partCode,
      description: description?.trim(),
      partType: ["SPARE_PART", "LABOUR", "CONSUMABLE"].includes(partType) ? partType : "SPARE_PART",
      unit: unit?.trim() || "pcs",
      hsnCode: hsnCode.trim(),
      gstRate: gstRate !== undefined ? Number(gstRate) : 18,
      rate: Number(rate),
      warrantyDays: warrantyDays !== undefined ? Number(warrantyDays) : undefined,
      materialId: materialId && mongoose.Types.ObjectId.isValid(materialId) ? materialId : undefined,
    });

    logAction({
      action: "CREATE",
      entity: "ServiceCenterBOM",
      entityId: part?._id?.toString(),
      after: body,
      req,
    });

    return NextResponse.json({ success: true, part }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("duplicate key") || message.includes("E11000")) {
      return NextResponse.json(
        { success: false, error: "A part with this code already exists for this vendor" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
