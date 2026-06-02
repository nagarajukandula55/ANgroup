export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";
import { generateInvoiceHTML } from "@/services/invoice/htmlInvoice.service";

/* =========================================
   GET
========================================= */
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Use POST method",
    },
    { status: 405 }
  );
}

/* =========================================
   POST
========================================= */
export async function POST(req: Request) {
  try {
    console.log("================================");
    console.log("INVOICE GENERATION STARTED");
    console.log("================================");

    console.log("STEP 0 - Connecting DB");
    await connectDB();

    const body = await req.json().catch(() => null);

    console.log("REQUEST BODY:", body);

    const orderId = body?.orderId;

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "orderId required",
        },
        { status: 400 }
      );
    }

    console.log("STEP 1 - Finding Order");

    const order = await Order.findOne({ orderId });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        { status: 404 }
      );
    }

    console.log("STEP 2 - Order Found");

    const orderObj = order.toObject();

    /* =========================================
       INVOICE NUMBER
    ========================================= */

    let invoiceNumber =
      orderObj?.invoice?.invoiceNumber || "N/A";

    try {
      console.log("STEP 3 - Creating Invoice");

      const createdInvoice =
        await createInvoiceForOrder(
          orderObj.orderId
        );

      console.log("STEP 4 - Invoice Created");
      console.log(createdInvoice);

      invoiceNumber =
        createdInvoice?.invoiceNumber ||
        invoiceNumber;
    } catch (err: any) {
      console.log(
        "Invoice already exists or creation failed:",
        err?.message
      );
    }

    /* =========================================
       NORMALIZE ORDER
    ========================================= */

    console.log("STEP 5 - Normalizing Order");

    const normalizedOrder = {
      ...orderObj,

      invoice: {
        ...(orderObj.invoice || {}),
        invoiceNumber,
      },

      billing: {
        subtotal:
          orderObj.subtotal ||
          orderObj.taxableAmount ||
          0,

        cgst:
          orderObj.cgst || 0,

        sgst:
          orderObj.sgst || 0,

        igst:
          orderObj.igst || 0,

        grandTotal:
          orderObj.amount || 0,

        currency: "INR",
      },
    };

    console.log("STEP 6 - Building Template");

    const template =
      buildInvoiceTemplate(
        normalizedOrder
      );

    console.log("STEP 7 - Template Built");

    console.log("STEP 8 - Generating HTML");

    const html =
      generateInvoiceHTML(
        template
      );

    console.log("STEP 9 - HTML Generated");
    console.log(
      "HTML LENGTH:",
      html?.length
    );

    /* =========================================
       TEMPORARILY SKIP CLOUDINARY
    ========================================= */

    console.log(
      "STEP 10 - SKIPPING CLOUDINARY UPLOAD"
    );

    const invoiceUrl = "";

    /* =========================================
       SAVE ORDER
    ========================================= */

    console.log("STEP 11 - Saving Order");

    order.invoice = {
      ...(order.invoice || {}),
      invoiceNumber,
      invoiceUrl,
      pdfGenerated: false,
      generatedAt: new Date(),
      htmlGenerated: true,
    };

    await order.save();

    console.log("STEP 12 - Order Saved");

    console.log("STEP 13 - Returning Response");

    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceUrl,
      htmlLength: html?.length,
    });
  } catch (err: any) {
    console.error("================================");
    console.error("INVOICE API ERROR");
    console.error(err);
    console.error("MESSAGE:", err?.message);
    console.error("STACK:", err?.stack);
    console.error("================================");

    return NextResponse.json(
      {
        success: false,
        message:
          err?.message ||
          "Internal Server Error",
        stack:
          process.env.NODE_ENV === "development"
            ? err?.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}
