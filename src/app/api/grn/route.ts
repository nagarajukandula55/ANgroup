import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import GRN from "@/models/GRN";
import PurchaseOrder from "@/models/PurchaseOrder";
import MaterialPriceHistory from "@/models/MaterialPriceHistory";

function generateGRNNumber() {
  return "GRN-" + Date.now();
}

/* ================= CREATE GRN ================= */
export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();
    const { poId, vendorId, items, businessId, createdBy } = body;

    const grn = await GRN.create({
      grnNumber: generateGRNNumber(),
      poId,
      vendorId,
      items,
      businessId,
      createdBy,
    });

    /* =========================================================
    🔥 UPDATE PRICE HISTORY AUTOMATICALLY
    ========================================================= */
    for (const item of items) {
      if (item.unitPrice) {
        await MaterialPriceHistory.create({
          businessId,
          materialId: item.materialId,
          vendorId,
          price: item.unitPrice,
          effectiveDate: new Date(),
          source: "GOODS_RECEIPT",
          sourceReferenceId: grn._id,
          sourceReferenceType: "GOODS_RECEIPT",
          createdBy,
        });
      }
    }

    /* =========================================================
    🔥 UPDATE PO STATUS
    ========================================================= */
    const po = await PurchaseOrder.findById(poId);

    if (po) {
      po.status = "PARTIALLY_RECEIVED";

      await po.save();
    }

    return NextResponse.json({ success: true, data: grn });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

/* ================= LIST GRN ================= */
export async function GET() {
  await dbConnect();

  const data = await GRN.find()
    .populate("poId")
    .populate("vendorId")
    .populate("items.materialId")
    .sort({ createdAt: -1 });

  return NextResponse.json({ success: true, data });
}
