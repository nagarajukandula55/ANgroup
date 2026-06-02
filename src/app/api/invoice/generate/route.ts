export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Invoice from "@/models/Invoice";
import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
import { buildInvoiceTemplate } from "@/services/invoiceTemplate.service";
import { generateInvoiceHTML } from "@/services/invoice/htmlInvoice.service";

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Use POST method",
    },
    { status: 405 }
  );
}

export async function POST(req: Request) {
  try {
    console.log("================================");
    console.log("INVOICE GENERATION STARTED");
    console.log("================================");

    await connectDB();

    const body = await req.json().catch(() => null);

    const orderId = body?.orderId;

    console.log("ORDER ID:", orderId);

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "orderId required",
        },
        { status: 400 }
      );
    }

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

    console.log("ORDER FOUND");

    const orderObj = order.toObject();

    let invoiceNumber =
      orderObj?.invoice?.invoiceNumber || "";

    let invoiceDoc;

    try {
      invoiceDoc =
        await createInvoiceForOrder(
          orderObj.orderId
        );

      invoiceNumber =
        invoiceDoc.invoiceNumber;

      console.log(
        "INVOICE CREATED:",
        invoiceNumber
      );
    } catch (err: any) {
      console.log(
        "CREATE INVOICE ERROR:",
        err?.message
      );

      invoiceDoc =
        await Invoice.findOne({
          orderId: orderObj.orderId,
        });

      if (invoiceDoc) {
        invoiceNumber =
          invoiceDoc.invoiceNumber;
      }
    }

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

    console.log("BUILD TEMPLATE");

    const template =
      buildInvoiceTemplate(
        normalizedOrder
      );

    console.log("GENERATE HTML");

    const html =
      generateInvoiceHTML(template);

    console.log(
      "HTML GENERATED:",
      html.length
    );

    order.invoice = {
      ...(order.invoice || {}),
      invoiceNumber,
      pdfGenerated: false,
      generatedAt: new Date(),
      htmlGenerated: true,
    };

    await order.save();

    console.log("ORDER UPDATED");

    return NextResponse.json({
      success: true,
      invoiceNumber,
      htmlLength: html.length,
      preview: html.substring(0, 500),
    });
  } catch (err: any) {
    console.error(
      "INVOICE GENERATION ERROR"
    );

    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message:
          err?.message ||
          "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
