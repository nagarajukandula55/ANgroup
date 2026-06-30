import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";
import ProductionOrder from "@/models/ProductionOrder";
import ProductionOrderItem from "@/models/ProductionOrderItem";

async function getNextOrderNumber(): Promise<string> {
  const last = await ProductionOrder.findOne(
    {},
    { orderNumber: 1 },
    { sort: { createdAt: -1 } }
  ).lean();
  if (!last || !(last as any).orderNumber) return "PO-0001";
  const match = ((last as any).orderNumber as string).match(/PO-(\d+)$/);
  const num = match ? parseInt(match[1]) + 1 : 1;
  return `PO-${String(num).padStart(4, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      isDeleted: false,
    };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const [orders, total] = await Promise.all([
      ProductionOrder.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductionOrder.countDocuments(query),
    ]);

    // Summary counts
    const [draftCount, plannedCount, inProgressCount, completedCount] =
      await Promise.all([
        ProductionOrder.countDocuments({
          businessId: new Types.ObjectId(businessId),
          status: "DRAFT",
          isDeleted: false,
        }),
        ProductionOrder.countDocuments({
          businessId: new Types.ObjectId(businessId),
          status: "PLANNED",
          isDeleted: false,
        }),
        ProductionOrder.countDocuments({
          businessId: new Types.ObjectId(businessId),
          status: "IN_PROGRESS",
          isDeleted: false,
        }),
        ProductionOrder.countDocuments({
          businessId: new Types.ObjectId(businessId),
          status: "COMPLETED",
          isDeleted: false,
        }),
      ]);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
      summary: { draftCount, plannedCount, inProgressCount, completedCount },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const body = await req.json();
    const {
      businessId,
      bomId,
      productName,
      productSku,
      plannedQuantity,
      unit,
      priority,
      plannedStartDate,
      plannedEndDate,
      notes,
      items = [],
    } = body;

    if (!businessId || !productName || !plannedQuantity) {
      return NextResponse.json(
        { error: "businessId, productName, and plannedQuantity are required" },
        { status: 400 }
      );
    }

    const orderNumber = await getNextOrderNumber();

    const order = await ProductionOrder.create({
      orderNumber,
      businessId: new Types.ObjectId(businessId),
      bomId: bomId ? new Types.ObjectId(bomId) : undefined,
      productName,
      productSku,
      plannedQuantity,
      unit: unit || "pcs",
      priority: priority || "NORMAL",
      plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : undefined,
      plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : undefined,
      notes,
      createdBy: userId,
      status: "DRAFT",
    });

    // Create order items if provided
    let createdItems: unknown[] = [];
    if (items.length > 0) {
      const itemDocs = items.map((item: Record<string, unknown>) => ({
        productionOrderId: order._id,
        businessId: new Types.ObjectId(businessId),
        materialId: item.materialId
          ? new Types.ObjectId(item.materialId as string)
          : undefined,
        materialName: item.materialName,
        materialSku: item.materialSku,
        requiredQuantity: item.requiredQuantity,
        unit: item.unit || "pcs",
        unitCost: item.unitCost || 0,
        totalCost:
          ((item.requiredQuantity as number) || 0) *
          ((item.unitCost as number) || 0),
        notes: item.notes,
      }));
      createdItems = await ProductionOrderItem.insertMany(itemDocs);
    }

    return NextResponse.json(
      { success: true, data: order, items: createdItems },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
