export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";
import { generateInvoiceHTML } from "@/services/invoice/htmlInvoice.service";
import cloudinary from "@/lib/cloudinary";

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

    /* =========================================
       FETCH ORDER
    ========================================= */

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

      const invoice = await createInvoiceForOrder(
        orderObj.orderId
      );

      console.log("STEP 4 - Invoice Created");
      console.log(invoice);

      invoiceNumber = invoice.invoiceNumber;
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

    /* =========================================
       TEMPLATE
    ========================================= */

    console.log("STEP 6 - Building Template");

    const template =
      buildInvoiceTemplate(normalizedOrder);

    console.log("STEP 7 - Template Built");

    /* =========================================
       HTML
    ========================================= */

    console.log("STEP 8 - Generating HTML");

    const html =
      generateInvoiceHTML(template);

    console.log("STEP 9 - HTML Generated");
    console.log("HTML LENGTH:", html?.length);

    /* =========================================
       CLOUDINARY UPLOAD
    ========================================= */

    console.log("STEP 10 - Uploading To Cloudinary");

    console.log({
      invoiceNumber,
      htmlLength: html?.length,
    });

    const upload =
      await cloudinary.uploader.upload(
        `data:text/html;charset=utf-8,${encodeURIComponent(
          html
        )}`,
        {
          folder: "an-group/invoices",
          resource_type: "raw",
          public_id: `invoice_${invoiceNumber}`,
          overwrite: true,
        }
      );

    console.log("STEP 11 - Cloudinary Upload Success");
    console.log(upload);

    const invoiceUrl =
      upload.secure_url;

    /* =========================================
       SAVE ORDER
    ========================================= */

    console.log("STEP 12 - Saving Order");

    order.invoice = {
      ...(order.invoice || {}),
      invoiceNumber,
      invoiceUrl,
      pdfGenerated: true,
      generatedAt: new Date(),
    };

    await order.save();

    console.log("STEP 13 - Order Saved");

    /* =========================================
       RESPONSE
    ========================================= */

    console.log("STEP 14 - Returning Response");

    return NextResponse.json({
      success: true,
      invoiceNumber,
      invoiceUrl,
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
