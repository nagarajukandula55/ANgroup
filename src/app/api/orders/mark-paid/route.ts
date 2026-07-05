import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { generateDocumentNumber } from "@/core/numbering/numberingService";

export async function POST(req: Request) {
  try {
    await connectDB();

    const { orderId, mode } = await req.json();

    const order = await Order.findOne({ orderId });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // prevent duplicate marking
    if (order.status === "PAID") {
      return NextResponse.json({
        success: true,
        message: "Already paid",
        invoiceNumber: order.invoice?.invoiceNumber,
      });
    }

    /**
     * SAFETY CHECK (IMPORTANT)
     * mode = "MANUAL" | "SYSTEM"
     */
    if (mode === "SYSTEM") {
      if (order.payment?.status !== "SUCCESS") {
        return NextResponse.json(
          { success: false, message: "Payment not verified" },
          { status: 400 }
        );
      }
    }

    // Was lib/numbering/invoiceNumber.ts's generateInvoiceNumber() — a
    // 12th previously-undiscovered duplicate/unsafe generator found while
    // reconciling PROGRESS.md's stale "known duplicates" checklist against
    // reality: it used Invoice.countDocuments() (the same race-condition
    // anti-pattern already fixed at every other call site during the
    // numbering-consolidation pass — two concurrent mark-paid calls for
    // the same business/financial-year could read the same count and
    // produce the same number), read its prefix from a different field
    // (business.documents.invoices.numbering.prefix) than the canonical
    // DocumentNumberConfig every other document type/admin UI actually
    // uses, and via lib/invoice/generateInvoiceNumber.ts pulled the
    // financial year from lib/invoice/getFinancialYear.ts — one of the 3
    // duplicate FY calculators the numbering consolidation was supposed to
    // eliminate. Fixed to use the canonical engine like every other
    // document type.
    const { value: invoiceNumber } = await generateDocumentNumber(
      String(order.businessId),
      "INVOICE"
    );

    order.status = "PAID";

    order.payment = {
      ...order.payment,
      status: "SUCCESS",
    };

    order.invoice = {
      invoiceNumber,
      generatedAt: new Date(),
      invoiceUrl: null,
    };

    await order.save();

    return NextResponse.json({
      success: true,
      invoiceNumber,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
