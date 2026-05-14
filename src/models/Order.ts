import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { calculateGST } from "@/lib/gst";

import Order from "@/models/Order";

/* =========================================================
   CORS
========================================================= */

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://shopnative.in",

  "Access-Control-Allow-Methods":
    "POST, OPTIONS",

  "Access-Control-Allow-Headers":
    "Content-Type, Authorization",
};

/* =========================================================
   OPTIONS
========================================================= */

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: corsHeaders,
    }
  );
}

/* =========================================================
   ORDER NUMBER
========================================================= */

async function generateOrderId() {

  const now = new Date();

  const year =
    now.getFullYear();

  const nextYear =
    String(year + 1).slice(-2);

  const fy =
    `${String(year).slice(-2)}${nextYear}`;

  const count =
    await Order.countDocuments();

  const serial = String(
    count + 1
  ).padStart(6, "0");

  return `NA-ORD-${fy}-${serial}`;
}

/* =========================================================
   CREATE ORDER
========================================================= */

export async function POST(
  req: Request
) {
  try {

    await connectDB();

    const body =
      await req.json();

    const {
      source = "NATIVE",

      cart,

      address,

      paymentMethod,

      coupon = "",

      discount = 0,

      gstType = "B2C",

      gstMode = "CGST_SGST",
    } = body;

    /* =========================================================
       VALIDATION
    ========================================================= */

    if (
      !cart ||
      !Array.isArray(cart) ||
      !cart.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Cart empty",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (
      !address?.name ||
      !address?.phone
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid customer info",
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    /* =========================================================
       PROCESS CART
    ========================================================= */

    const processedCart =
      cart.map((item: any) => {

        const qty =
          Number(item.qty || 1);

        const sellingPrice =
          Number(
            item.sellingPrice ||
            item.price ||
            0
          );

        const gstPercent =
          Number(
            item.gstPercent || 18
          );

        const gst =
          calculateGST(
            sellingPrice,
            gstPercent
          );

        return {

          productId:
            item.productId,

          sku:
            item.sku || "",

          name:
            item.name,

          variant:
            item.variant || "",

          hsn:
            item.hsn || "",

          qty,

          sellingPrice:
            sellingPrice,

          mrp:
            Number(
              item.mrp ||
              sellingPrice
            ),

          taxableValue:
            +(
              gst.taxableValue *
              qty
            ).toFixed(2),

          gstPercent,

          cgst:
            +(
              gst.cgst *
              qty
            ).toFixed(2),

          sgst:
            +(
              gst.sgst *
              qty
            ).toFixed(2),

          igst:
            +(
              gst.igst *
              qty
            ).toFixed(2),

          lineTotal:
            +(
              sellingPrice *
              qty
            ).toFixed(2),
        };
      });

    /* =========================================================
       TOTALS
    ========================================================= */

    const subtotal =
      +processedCart
        .reduce(
          (
            acc: number,
            item: any
          ) =>
            acc +
            item.taxableValue,
          0
        )
        .toFixed(2);

    const cgst =
      +processedCart
        .reduce(
          (
            acc: number,
            item: any
          ) =>
            acc + item.cgst,
          0
        )
        .toFixed(2);

    const sgst =
      +processedCart
        .reduce(
          (
            acc: number,
            item: any
          ) =>
            acc + item.sgst,
          0
        )
        .toFixed(2);

    const igst =
      +processedCart
        .reduce(
          (
            acc: number,
            item: any
          ) =>
            acc + item.igst,
          0
        )
        .toFixed(2);

    const gstTotal =
      +(
        cgst +
        sgst +
        igst
      ).toFixed(2);

    const shippingCharges = 0;

    const taxableAmount =
      subtotal;

    const roundOff = 0;

    const amount =
      +(
        subtotal +
        gstTotal +
        shippingCharges -
        discount +
        roundOff
      ).toFixed(2);

    /* =========================================================
       IDS
    ========================================================= */

    const orderId =
      await generateOrderId();

    /* =========================================================
       PAYMENT STATUS
    ========================================================= */

    let paymentStatus =
      "NOT_INITIATED";

    if (
      paymentMethod ===
      "RAZORPAY"
    ) {
      paymentStatus =
        "INITIATED";
    }

    if (
      paymentMethod ===
      "UPI"
    ) {
      paymentStatus =
        "PENDING";
    }

    if (
      paymentMethod ===
      "COD"
    ) {
      paymentStatus =
        "PENDING";
    }

    /* =========================================================
       INVOICE TYPE
    ========================================================= */

    const invoiceType =
      gstType === "B2B"
        ? "B2B"
        : "TAX";

    /* =========================================================
       CREATE ORDER
    ========================================================= */

    const order =
      await Order.create({

        source,

        orderId,

        cart:
          processedCart,

        address,

        subtotal,

        discount,

        taxableAmount,

        cgst,

        sgst,

        igst,

        gstTotal,

        shippingCharges,

        roundOff,

        amount,

        coupon,

        gstType,

        gstMode,

        taxItems: [],

        status:
          "PENDING_PAYMENT",

        payment: {
          method:
            paymentMethod,

          status:
            paymentStatus,

          amountPaid: 0,
        },

        invoice: {

          invoiceType,

          pdfGenerated:
            false,

          locked:
            false,
        },

        paymentVerified:
          false,

        stockReserved:
          false,

        invoiceGenerated:
          false,

        shipmentCreated:
          false,

        locked:
          false,

        events: [
          {
            type:
              "ORDER_CREATED",

            message:
              "Order created successfully",

            createdAt:
              new Date(),
          },
        ],
      });

    /* =========================================================
       RAZORPAY
    ========================================================= */

    let razorpayOrder =
      null;

    if (
      paymentMethod ===
      "RAZORPAY"
    ) {
      try {

        const Razorpay = (
          await import(
            "razorpay"
          )
        ).default;

        const razorpay =
          new Razorpay({

            key_id:
              process.env
                .RAZORPAY_KEY_ID!,

            key_secret:
              process.env
                .RAZORPAY_KEY_SECRET!,
          });

        razorpayOrder =
          await razorpay
            .orders
            .create({

              amount:
                Math.round(
                  amount * 100
                ),

              currency:
                "INR",

              receipt:
                orderId,

              notes: {
                orderId,
              },
            });

        order.payment.gatewayOrderId =
          razorpayOrder.id;

        await order.save();

      } catch (err) {

        console.error(
          "RAZORPAY ERROR",
          err
        );
      }
    }

    /* =========================================================
       RESPONSE
    ========================================================= */

    return NextResponse.json(
      {
        success: true,

        orderId,

        amount,

        razorpayOrder,
      },
      {
        headers:
          corsHeaders,
      }
    );

  } catch (err: any) {

    console.error(
      "ORDER CREATE ERROR",
      err
    );

    return NextResponse.json(
      {
        success: false,

        message:
          err.message ||
          "Internal Server Error",
      },
      {
        status: 500,

        headers:
          corsHeaders,
      }
    );
  }
}

OrderSchema.index({
  "shipping.awbNumber": 1,
});

/* =========================================================
   EXPORT
========================================================= */

const Order =
  mongoose.models.Order ||
  mongoose.model(
    "Order",
    OrderSchema
  );

export default Order;
