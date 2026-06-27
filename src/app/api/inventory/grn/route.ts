import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import InventoryMovement from "@/models/InventoryMovement";
import PurchaseOrder from "@/models/PurchaseOrder";
import InventoryItem from "@/models/InventoryItem";

/* =========================================================
 * GET GRN LIST (OPTIONAL TRACKING VIEW)
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

    requirePermission(session as any, "inventory.view");

    const { searchParams } = new URL(req.url);
    const purchaseOrderId = searchParams.get("purchaseOrderId");

    const query: any = {
      businessId: new Types.ObjectId(session.business.businessId),
      referenceType: "GRN",
    };

    if (purchaseOrderId) {
      query.referenceId = new Types.ObjectId(purchaseOrderId);
    }

    const grns = await InventoryMovement.find(query).sort({
      createdAt: -1,
    });

    return NextResponse.json({
      success: true,
      data: grns,
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
 * CREATE GRN (GOODS RECEIPT NOTE)
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

    requirePermission(session as any, "inventory.manage");

    const body = await req.json();

    const {
      purchaseOrderId,
      items, // [{ materialId, warehouseId, quantity }]
      notes,
    } = body;

    if (!purchaseOrderId || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const businessId = session.business.businessId;

    /**
     * STEP 1: Validate Purchase Order
     */
    const po = await PurchaseOrder.findOne({
      _id: new Types.ObjectId(purchaseOrderId),
      businessId: new Types.ObjectId(businessId),
      isDeleted: false,
    });

    if (!po) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    if (po.status !== "APPROVED") {
      return NextResponse.json(
        {
          error:
            "Only APPROVED purchase orders can generate GRN",
        },
        { status: 400 }
      );
    }

    /**
     * STEP 2: Create GRN Movements
     */
    const movements = [];

    for (const item of items) {
      const movement = await InventoryMovement.create({
        businessId: new Types.ObjectId(businessId),
        materialId: new Types.ObjectId(item.materialId),
        warehouseId: new Types.ObjectId(item.warehouseId),
        type: "IN",
        quantity: item.quantity,
        referenceId: new Types.ObjectId(purchaseOrderId),
        referenceType: "GRN",
        notes: notes || "Goods Receipt Note",
        createdBy: session.user.id,
      });

      movements.push(movement);

      /**
       * STEP 3: Update Inventory Stock
       */
      const inventory = await InventoryItem.findOne({
        businessId: new Types.ObjectId(businessId),
        materialId: new Types.ObjectId(item.materialId),
        warehouseId: new Types.ObjectId(item.warehouseId),
      });

      if (inventory) {
        inventory.quantity += item.quantity;
        await inventory.save();
      } else {
        await InventoryItem.create({
          businessId: new Types.ObjectId(businessId),
          materialId: new Types.ObjectId(item.materialId),
          warehouseId: new Types.ObjectId(item.warehouseId),
          quantity: item.quantity,
          createdBy: session.user.id,
        });
      }
    }

    /**
     * STEP 4: Optional PO status update
     */
    po.status = "COMPLETED";
    await po.save();

    return NextResponse.json({
      success: true,
      message: "GRN created successfully",
      data: movements,
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
