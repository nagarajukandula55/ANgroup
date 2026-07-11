import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";
import Brand from "@/models/Brand";
import { logAction } from "@/lib/audit/logAction";
import { buildBusinessScopeQuery } from "@/core/catalog/businessScopeFilter";

// GET /api/brands?businessId=...&search=...&isActive=...
export async function GET(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const search = searchParams.get("search");
    const isActive = searchParams.get("isActive");

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    await connectDB();

    const scopeQuery = buildBusinessScopeQuery(businessId);
    const query: Record<string, unknown> = { ...scopeQuery };

    if (isActive !== null) {
      query.isActive = isActive === "true";
    }

    if (search) {
      query.$and = [
        { $or: scopeQuery.$or },
        { $or: [{ name: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }] },
      ];
      delete query.$or;
    }

    const brands = await Brand.find(query).sort({ name: 1 }).lean();

    return NextResponse.json({ success: true, brands });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/brands
export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { name, description, businessId, logoUrl, businessScope, businessIds } = body;

    if (!name || !businessId) {
      return NextResponse.json(
        { error: "name and businessId are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const brand = await Brand.create({
      name: name.trim(),
      description: description?.trim(),
      businessId: new Types.ObjectId(businessId),
      logoUrl: logoUrl?.trim(),
      businessScope: businessScope || "SINGLE",
      businessIds: Array.isArray(businessIds) ? businessIds : [],
    });

    logAction({
      action: "CREATE",
      entity: "Brand",
      entityId: brand?._id?.toString(),
      after: body,
      req,
    });

    return NextResponse.json({ success: true, brand }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("duplicate key") || message.includes("E11000")) {
      return NextResponse.json(
        { success: false, error: "A brand with this name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
