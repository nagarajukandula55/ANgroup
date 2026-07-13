import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";
import DeviceModel from "@/models/DeviceModel";
import { logAction } from "@/lib/audit/logAction";

// PUT /api/device-models/[id]
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid model id" }, { status: 400 });
    }

    const body = await req.json();
    const { name, brandId, isActive, businessScope, businessIds } = body;

    await connectDB();

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (brandId !== undefined && Types.ObjectId.isValid(brandId)) updates.brandId = brandId;
    if (isActive !== undefined) updates.isActive = isActive;
    if (businessScope !== undefined) updates.businessScope = businessScope;
    if (businessIds !== undefined) updates.businessIds = businessIds;

    const model = await DeviceModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    logAction({ action: "UPDATE", entity: "DeviceModel", entityId: id, after: updates, req });

    return NextResponse.json({ success: true, model });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("duplicate key") || message.includes("E11000")) {
      return NextResponse.json({ success: false, error: "This model already exists for this brand" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/device-models/[id]
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid model id" }, { status: 400 });
    }

    await connectDB();

    const model = await DeviceModel.findByIdAndDelete(id).lean();
    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    logAction({ action: "DELETE", entity: "DeviceModel", entityId: id, req });

    return NextResponse.json({ success: true, message: "Model deleted" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
