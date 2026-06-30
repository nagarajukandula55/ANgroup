import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";
import StockTransfer from "@/models/StockTransfer";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Zero-padded sequential transfer number: ST-YYYYMMDD-XXXX */
async function generateTransferNumber(): Promise<string> {
  const date = new Date();
  const dateStr =
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0");

  const prefix = `ST-${dateStr}-`;

  const last = await StockTransfer.findOne(
    { transferNumber: { $regex: `^${prefix}` } },
    { transferNumber: 1 },
    { sort: { transferNumber: -1 } }
  ).lean();

  let seq = 1;
  if (last && typeof last.transferNumber === "string") {
    const parts = last.transferNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// GET /api/stock/transfers?businessId=...&status=...&page=1&limit=20
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const status = searchParams.get("status");
    const fromWarehouse = searchParams.get("fromWarehouse");
    const toWarehouse = searchParams.get("toWarehouse");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
    );

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(businessId)) {
      return NextResponse.json(
        { error: "Invalid businessId" },
        { status: 400 }
      );
    }

    const filter: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };

    if (status) filter.status = status;
    if (fromWarehouse) filter.fromWarehouse = fromWarehouse;
    if (toWarehouse) filter.toWarehouse = toWarehouse;

    const [transfers, total] = await Promise.all([
      StockTransfer.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StockTransfer.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: transfers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/stock/transfers
// Body: { businessId, fromWarehouse, toWarehouse, items, notes?, status? }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const {
      businessId,
      fromWarehouse,
      toWarehouse,
      items,
      notes,
      status = "DRAFT",
      transferredAt,
    } = body;

    // --- Validate required fields ---
    if (!businessId || !Types.ObjectId.isValid(businessId)) {
      return NextResponse.json(
        { error: "Valid businessId is required" },
        { status: 400 }
      );
    }

    if (!fromWarehouse || typeof fromWarehouse !== "string") {
      return NextResponse.json(
        { error: "fromWarehouse is required" },
        { status: 400 }
      );
    }

    if (!toWarehouse || typeof toWarehouse !== "string") {
      return NextResponse.json(
        { error: "toWarehouse is required" },
        { status: 400 }
      );
    }

    if (fromWarehouse === toWarehouse) {
      return NextResponse.json(
        { error: "fromWarehouse and toWarehouse must be different" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "At least one item is required" },
        { status: 400 }
      );
    }

    // Validate each line item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemId || !Types.ObjectId.isValid(item.itemId)) {
        return NextResponse.json(
          { error: `Item at index ${i}: valid itemId is required` },
          { status: 400 }
        );
      }
      if (!item.itemName || typeof item.itemName !== "string") {
        return NextResponse.json(
          { error: `Item at index ${i}: itemName is required` },
          { status: 400 }
        );
      }
      if (typeof item.quantity !== "number" || item.quantity <= 0) {
        return NextResponse.json(
          { error: `Item at index ${i}: quantity must be a positive number` },
          { status: 400 }
        );
      }
    }

    const validStatuses = ["DRAFT", "IN_TRANSIT", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const transferNumber = await generateTransferNumber();

    const transfer = await StockTransfer.create({
      transferNumber,
      businessId: new Types.ObjectId(businessId),
      fromWarehouse: fromWarehouse.trim(),
      toWarehouse: toWarehouse.trim(),
      items: items.map((item: {
        itemId: string;
        itemName: string;
        sku?: string;
        quantity: number;
        unit?: string;
        unitCost?: number;
      }) => ({
        itemId: new Types.ObjectId(item.itemId),
        itemName: item.itemName,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit ?? "pcs",
        unitCost: item.unitCost ?? 0,
      })),
      status,
      notes: notes ?? undefined,
      requestedBy: new Types.ObjectId(userId),
      transferredAt: transferredAt ? new Date(transferredAt) : undefined,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    });

    return NextResponse.json(
      { success: true, data: transfer },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
