import { NextResponse } from "next/server";
import Invoice from "@/models/Invoice";
import Order from "@/models/Order";
import { connectDB } from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const invoiceNumber =
      context.params.invoiceNumber;

    const invoice =
      await Invoice.findOne({
        invoiceNumber,
      });

    if (!invoice) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice not found",
        },
        {
          status: 404,
        }
      );
    }

    const order =
      await Order.findOne({
        _id: invoice.orderId,
      });

    return NextResponse.json({
      success: true,

      invoiceNumber:
        invoice.invoiceNumber,

      invoiceDate:
        invoice.createdAt,

      orderDate:
        order?.createdAt || "",

      orderId:
        order?.orderId || "",

      type:
        invoice.invoiceType,

      company: {
        name: "Native",
        tagline:
          "Eat Healthy, Stay Healthy",

        address1:
          process.env.COMPANY_ADDRESS1 || "",

        address2:
          process.env.COMPANY_ADDRESS2 || "",

        city:
          process.env.COMPANY_CITY || "",

        state:
          process.env.COMPANY_STATE || "",

        gstin:
          process.env.COMPANY_GSTIN || "",

        phone:
          process.env.COMPANY_PHONE || "",
      },

      customer: {
        name:
          invoice.customer?.name,

        phone:
          invoice.customer?.phone,

        email:
          invoice.customer?.email,

        address:
          invoice.customer?.address,

        city:
          invoice.customer?.city,

        state:
          invoice.customer?.state,

        pincode:
          invoice.customer?.pincode,

        gstin:
          invoice.customer?.gstNumber,

        stateCode:
          "",
      },

      shipping: {
        name:
          invoice.customer?.name,

        phone:
          invoice.customer?.phone,

        address:
          invoice.customer?.address,

        city:
          invoice.customer?.city,

        state:
          invoice.customer?.state,

        pincode:
          invoice.customer?.pincode,
      },

      payment: {
        method:
          order?.payment?.method ||
          "ONLINE",

        status:
          invoice.paymentStatus,

        transactionId:
          order?.payment
            ?.transactionId || "",
      },

      items:
        invoice.items.map(
          (item: any) => ({
            name: item.name,

            hsn: item.hsn,

            qty: item.qty,

            rate:
              item.price,

            gstPercent:
              item.gstPercent,

            taxable:
              item.taxableValue,

            total:
              item.total,
          })
        ),

      summary: {
        taxable:
          invoice.taxableAmount,

        discount: 0,

        cgst:
          invoice.cgst,

        sgst:
          invoice.sgst,

        igst:
          invoice.igst,

        grandTotal:
          invoice.grandTotal,
      },

      placeOfSupply:
        invoice.customer?.state,

      stateCode: "",

      supplyType:
        invoice.invoiceType ===
        "B2B"
          ? "Business"
          : "Consumer",

      reverseCharge:
        "No",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          err.message,
      },
      {
        status: 500,
      }
    );
  }
}
