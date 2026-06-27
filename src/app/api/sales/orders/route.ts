import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import SalesOrder from "@/models/SalesOrder";
import InventoryMovement from "@/models/InventoryMovement";
import InventoryItem from "@/models/InventoryItem";

/* =========================================================
 * GET SALES ORDERS
 * =======================================================*/
export async function GET(req: NextRequest) {
  try {
    const session = await getEnrichedSession();

    if (!session?.user || !session.business) {
      return NextResponse.json(
        { error: "Unauthorized or missing business context" },
        { status: 401 }
      );
    }

    requirePermission(session as any, "sales.view");

    const orders = await SalesOrder.find({
      businessId: new Types.ObjectId(session.business.businessId),
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
 * CREATE SALES ORDER (RESERVATION ONLY)
 * =======================================================*/
export async function POST(req: NextRequest) {
  try {
    const session = await getEnrichedSession();

    if (!session?.user || !session.business) {
      return NextResponse.json(
        { error: "Unauthorized or missing business context" },
        { status: 401 }
      );
    }

    requirePermission(session as any, "sales.create");

    const body = await req.json();

    const { customerId, items, expectedDate } = body;

    if (!customerId || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const businessId = session.business.businessId;

    /**
     * STEP 1: Create Sales Order
     */
    const order = await SalesOrder.create({
      businessId: new Types.ObjectId(businessId),
      customerId: new Types.ObjectId(customerId),
      items,
      expectedDate,
      status: "CONFIRMED",
      createdBy: session.user.id,
    });

    /**
     * STEP 2: Deduct inventory (OUT movement)
     */
    for (const item of items) {
      await InventoryMovement.create({
        businessId: new Types.ObjectId(businessId),
        materialId: new Types.ObjectId(item.materialId),
        warehouseId: new Types.ObjectId(item.warehouseId),
        type: "OUT",
        quantity: item.quantity,
        referenceId: order._id,
        referenceType: "SALES_ORDER",
        notes: "Sales Order Consumption",
        createdBy: session.user.id,
      });

      const inventory = await InventoryItem.findOne({
        businessId: new Types.ObjectId(businessId),
        materialId: new Types.ObjectId(item.materialId),
        warehouseId: new Types.ObjectId(item.warehouseId),
      });

      if (inventory) {
        inventory.quantity -= item.quantity;
        await inventory.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: "Sales order created and inventory updated",
      data: order,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
