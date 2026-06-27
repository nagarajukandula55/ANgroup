import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import Invoice from "@/models/Invoice";
import SalesOrder from "@/models/SalesOrder";

/* =========================================================
 * GET INVOICES
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

    requirePermission(session as any, "finance.view");

    const invoices = await Invoice.find({
      businessId: new Types.ObjectId(session.business.businessId),
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: invoices,
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
 * CREATE INVOICE FROM SALES ORDER
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

    requirePermission(session as any, "finance.create");

    const body = await req.json();

    const { salesOrderId, taxRate } = body;

    if (!salesOrderId) {
      return NextResponse.json(
        { error: "salesOrderId is required" },
        { status: 400 }
      );
    }

    const businessId = session.business.businessId;

    /**
     * STEP 1: Validate Sales Order
     */
    const order = await SalesOrder.findOne({
      _id: new Types.ObjectId(salesOrderId),
      businessId: new Types.ObjectId(businessId),
      isDeleted: false,
    });

    if (!order) {
      return NextResponse.json(
        { error: "Sales order not found" },
        { status: 404 }
      );
    }

    /**
     * STEP 2: Calculate totals
     */
    let subTotal = 0;

    for (const item of order.items) {
      subTotal += item.quantity * (item.price || 0);
    }

    const taxAmount = taxRate
      ? (subTotal * taxRate) / 100
      : 0;

    const totalAmount = subTotal + taxAmount;

    /**
     * STEP 3: Create Invoice
     */
    const invoice = await Invoice.create({
      businessId: new Types.ObjectId(businessId),
      salesOrderId: new Types.ObjectId(salesOrderId),
      subTotal,
      taxRate: taxRate || 0,
      taxAmount,
      totalAmount,
      status: "DRAFT",
      createdBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Invoice created successfully",
      data: invoice,
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
