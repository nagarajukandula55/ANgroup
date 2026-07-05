import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";
import SalesOrder from "@/models/SalesOrder";
import PurchaseOrder from "@/models/PurchaseOrder";
import Invoice from "@/models/Invoice";
import Payment from "@/models/Payment";
import InventoryItem from "@/models/InventoryItem";

/* =========================================================
 * DASHBOARD OVERVIEW (ERP METRICS)
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

    requirePermission(session as any, buildPermissionCode("dashboard", "view"));

    const businessId = new Types.ObjectId(
      session.business.businessId
    );

    /**
     * =====================================================
     * SALES METRICS
     * =====================================================
     */
    const totalSalesOrders = await SalesOrder.countDocuments({
      businessId,
      isDeleted: false,
    });

    const salesRevenueAgg = await Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $in: ["PAID", "PARTIALLY_PAID"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalRevenue = salesRevenueAgg[0]?.total || 0;

    /**
     * =====================================================
     * PURCHASE METRICS
     * =====================================================
     */
    const totalPurchaseOrders = await PurchaseOrder.countDocuments(
      {
        businessId,
        isDeleted: false,
      }
    );

    const purchaseAgg = await PurchaseOrder.aggregate([
      {
        $match: {
          businessId,
          status: "APPROVED",
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalAmount" },
        },
      },
    ]);

    const totalPurchases = purchaseAgg[0]?.total || 0;

    /**
     * =====================================================
     * PAYMENT METRICS
     * =====================================================
     */
    const paymentAgg = await Payment.aggregate([
      {
        $match: {
          businessId,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totalPayments = paymentAgg[0]?.total || 0;

    /**
     * =====================================================
     * INVENTORY METRICS
     * =====================================================
     */
    const inventoryAgg = await InventoryItem.aggregate([
      {
        $match: {
          businessId,
        },
      },
      {
        $group: {
          _id: null,
          totalItems: { $sum: "$quantity" },
        },
      },
    ]);

    const totalStock = inventoryAgg[0]?.totalItems || 0;

    /**
     * =====================================================
     * FINAL RESPONSE
     * =====================================================
     */
    return NextResponse.json({
      success: true,
      data: {
        sales: {
          totalOrders: totalSalesOrders,
          revenue: totalRevenue,
        },
        purchases: {
          totalOrders: totalPurchaseOrders,
          totalSpend: totalPurchases,
        },
        finance: {
          totalPayments,
          outstanding: totalRevenue - totalPayments,
        },
        inventory: {
          totalStock,
        },
      },
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
