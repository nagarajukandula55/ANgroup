import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";
import StockAdjustment from "@/models/StockAdjustment";
import InventoryItem from "@/models/InventoryItem";

/* =========================================================
 * GET /api/stock/adjustments?businessId=&page=&limit=&inventoryItemId=
 * List adjustments for a business with optional item filter + pagination
 * =======================================================*/
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const skip = (page - 1) * limit;

    const inventoryItemId = searchParams.get("inventoryItemId");

    const filter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };
    if (inventoryItemId) {
      filter.inventoryItemId = new Types.ObjectId(inventoryItemId);
    }

    const [adjustments, total] = await Promise.all([
      StockAdjustment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockAdjustment.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: adjustments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/* =========================================================
 * POST /api/stock/adjustments
 * Create a new adjustment and update the inventory item quantity
 *
 * Body:
 *   businessId      string (required)
 *   inventoryItemId string (required)
 *   adjustmentType  "ADD" | "REMOVE" | "SET"  (required)
 *   quantity        number (required) — amount to add/remove, or absolute value for SET
 *   reason          string (optional)
 *   notes           string (optional)
 * =======================================================*/
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { businessId, inventoryItemId, adjustmentType, quantity, reason, notes } =
      body;

    if (!businessId || !inventoryItemId || !adjustmentType || quantity === undefined) {
      return NextResponse.json(
        { error: "businessId, inventoryItemId, adjustmentType, and quantity are required" },
        { status: 400 }
      );
    }

    if (!["ADD", "REMOVE", "SET"].includes(adjustmentType)) {
      return NextResponse.json(
        { error: "adjustmentType must be ADD, REMOVE, or SET" },
        { status: 400 }
      );
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return NextResponse.json(
        { error: "quantity must be a non-negative number" },
        { status: 400 }
      );
    }

    // Fetch the current inventory item
    const item = await InventoryItem.findOne({
      _id: new Types.ObjectId(inventoryItemId),
      businessId: new Types.ObjectId(businessId),
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const previousQuantity: number = item.quantity ?? 0;
    let newQuantity: number;

    switch (adjustmentType) {
      case "ADD":
        newQuantity = previousQuantity + qty;
        break;
      case "REMOVE":
        newQuantity = Math.max(0, previousQuantity - qty);
        break;
      case "SET":
        newQuantity = qty;
        break;
      default:
        newQuantity = previousQuantity;
    }

    // Persist the adjustment record first
    const adjustment = await StockAdjustment.create({
      businessId: new Types.ObjectId(businessId),
      inventoryItemId: new Types.ObjectId(inventoryItemId),
      adjustmentType,
      quantityAdjusted: qty,
      previousQuantity,
      newQuantity,
      reason: reason || undefined,
      notes: notes || undefined,
      adjustedBy: userId,
    });

    // Update the inventory item quantity
    await InventoryItem.findByIdAndUpdate(
      new Types.ObjectId(inventoryItemId),
      { $set: { quantity: newQuantity } }
    );

    return NextResponse.json(
      {
        success: true,
        data: adjustment,
        previousQuantity,
        newQuantity,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
