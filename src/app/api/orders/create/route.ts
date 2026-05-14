import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { calculateGST } from "@/lib/gst";
import Order from "@/models/Order";
import { connectNativeDB } from "@/lib/native-mongodb";
import { getProductModel } from "@/models/Product";
import mongoose from "mongoose";

const nativeConn = await connectNativeDB();
const Product = getProductModel(nativeConn);

/* =========================================================
   CORS (ERP SAFE)
========================================================= */

const allowedOrigins = [
     "https://shopnative.in",
     "https://www.shopnative.in",
   ];

const getCorsHeaders = (
  origin?: string | null
) => ({
  ...corsHeaders,
  "Access-Control-Allow-Origin":
    origin &&
    allowedOrigins.includes(origin)
      ? origin
      : "https://shopnative.in",
});

const corsHeaders = {
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",

  "Access-Control-Allow-Headers":
    "Content-Type, Authorization",
};

/* =========================================================
   OPTIONS
========================================================= */

export async function OPTIONS(
  req: Request
) {
  const origin =
    req.headers.get("origin");

  return NextResponse.json(
    {},
    {
      headers: {
        ...corsHeaders,
      "Access-Control-Allow-Origin":
        allowedOrigins.includes(origin || "")
          ? origin!
          : "https://shopnative.in",
      },
    }
  );
}

/* =========================================================
   ERP-GRADE ORDER ID (NO COLLISION RISK)
========================================================= */

async function generateOrderId() {
  const now = new Date();

  const ts =
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const random = Math.floor(Math.random() * 9000 + 1000);

  return `NA-ORD-${ts}-${random}`;
}

/* =========================================================
   CREATE ORDER
========================================================= */

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
     const nativeConn = await connectNativeDB();
     const Product = getProductModel(nativeConn);

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
   
   const safeDiscount = Math.max(
     0,
     Number(discount || 0)
   );

   const origin = req.headers.get("origin");
   
   const isAllowedOrigin =
     !!origin &&
     allowedOrigins.includes(origin);
   
   if (!isAllowedOrigin) {
     return NextResponse.json(
       {
         success: false,
         message: "Unauthorized origin",
       },
       {
         status: 403,
         headers: getCorsHeaders(origin),
       }
     );
   }

    /* =========================================================
       VALIDATION
    ========================================================= */

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart empty" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

   const phoneRegex = /^[6-9]\d{9}$/;
   const pincodeRegex = /^\d{6}$/;

   if (
     !address?.name ||
     !address?.phone ||
     !address?.addressLine1 ||
     !address?.city ||
     !address?.state ||
     !address?.pincode
   ) {
     return NextResponse.json(
       {
         success: false,
         message: "Incomplete address",
       },
       {
         status: 400,
         headers: getCorsHeaders(origin),
       }
     );
   }
   
   if (!phoneRegex.test(address.phone)) {
     return NextResponse.json(
       {
         success: false,
         message: "Invalid phone number",
       },
       {
         status: 400,
         headers: getCorsHeaders(origin),
       }
     );
   }
   
   if (!pincodeRegex.test(address.pincode)) {
     return NextResponse.json(
       {
         success: false,
         message: "Invalid pincode",
       },
       {
         status: 400,
         headers: getCorsHeaders(origin),
       }
     );
   }

   /* ===============      ================*/
      
      const allowedPaymentMethods = [
        "RAZORPAY",
        "UPI",
      ];
      
      if (
        !allowedPaymentMethods.includes(
          paymentMethod
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid payment method",
          },
          {
            status: 400,
            headers: getCorsHeaders(origin),
          }
        );
      }

 /* =========================================================
   PROCESS CART (SECURE ERP LAYER)
========================================================= */

const processedCart = await Promise.all(
  cart.map(async (raw: any) => {
    /* ================= VALIDATE INPUT ================= */

    const qty = parseInt(raw.qty, 10);

    if (
      !raw.productId ||
      !Number.isInteger(qty) ||
      qty <= 0 ||
      qty > 10
    ) {
      throw new Error(
        "Invalid cart item quantity"
      );
    }

    /* ================= FETCH PRODUCT ================= */

    const conditions: any[] = [
      { productId: raw.productId },
      { productKey: raw.productId },
    ];

    if (
      mongoose.Types.ObjectId.isValid(
        raw.productId
      )
    ) {
      conditions.push({
        _id: raw.productId,
      });
    }

    const product = await Product.findOne({
      $or: conditions,
    }).lean<any>();

    /* ================= PRODUCT VALIDATION ================= */

    if (!product) {
      throw new Error(
        `Product not found: ${raw.productId}`
      );
    }

    if (product.status !== "ACTIVE") {
      throw new Error(
        `${product.name} unavailable`
      );
    }

    /* ================= STOCK VALIDATION ================= */

    const availableStock = Number(
      product.stock || 0
    );

    if (availableStock < qty) {
      throw new Error(
        `${product.name} is out of stock`
      );
    }

    /* ================= SECURE DB VALUES ================= */

    const sellingPrice = Number(
      product.sellingPrice ??
      product.price ??
      product.mrp ??
      0
    );

    if (
      sellingPrice < 0 ||
      isNaN(sellingPrice)
    ) {
      throw new Error(
        `Invalid pricing for ${product.name}`
      );
    }

    const mrp = Number(
      product.mrp || sellingPrice
    );

    const gstPercent = Number(
      product.gstPercent ||
      product.tax ||
      18
    );

    /* ================= GST ================= */

    const allowedGstModes = [
      "CGST_SGST",
      "IGST",
    ];

    if (
      !allowedGstModes.includes(gstMode)
    ) {
      throw new Error("Invalid GST mode");
    }

    const gst = calculateGST(
      sellingPrice,
      gstPercent,
      gstMode
    );

    /* ================= ORDER SNAPSHOT ================= */

    return {
      productId: String(product._id),

      sku: product.sku || "",

      name: product.name || "",

      variant:
        raw.variant || "default",

      hsn: product.hsn || "",

      qty,

      sellingPrice,

      mrp,

      taxableValue:
        gst.taxableValue,

      gstPercent,

      cgst: gst.cgst,

      sgst: gst.sgst,

      igst: gst.igst,

      total: +(
        gst.total * qty
      ).toFixed(2),
    };
  })
);
     
    /* =========================================================
       TOTAL CALCULATION (AUDIT SAFE)
    ========================================================= */

   const subtotal = +processedCart
        .reduce(
          (a, i) =>
            a + i.taxableValue * i.qty,
          0
        )
        .toFixed(2);

   const cgst = +processedCart
     .reduce((a, i) => a + i.cgst * i.qty, 0)
     .toFixed(2);
   
   const sgst = +processedCart
     .reduce((a, i) => a + i.sgst * i.qty, 0)
     .toFixed(2);
   
   const igst = +processedCart
     .reduce((a, i) => a + i.igst * i.qty, 0)
     .toFixed(2);

   const gstTotal = +(
        cgst + sgst + igst
      ).toFixed(2);

   const finalDiscount = Math.min(
     safeDiscount,
     subtotal + gstTotal
   );

    const shippingCharges = 0;
    const roundOff = 0;

   const amount = +Math.max(
     1,
     subtotal +
       gstTotal +
       shippingCharges -
       finalDiscount +
       roundOff
   ).toFixed(2);

    /* =========================================================
       ORDER ID
    ========================================================= */

    let orderId = "";

   let exists = true;
   
   while (exists) {
     orderId = await generateOrderId();
   
     exists = !!(await Order.findOne({
       orderId,
     }));
   }

    /* =========================================================
       PAYMENT STATE MACHINE
    ========================================================= */

    const orderStatus = "PENDING_PAYMENT";
     
    let paymentStatus = "NOT_INITIATED";

    if (paymentMethod === "RAZORPAY") paymentStatus = "INITIATED";
    if (paymentMethod === "UPI") paymentStatus = "PENDING";

    const invoiceType = gstType === "B2B" ? "B2B" : "TAX";

   
     /* ===============  ================ */

     const existingPending =
           await Order.findOne({
             "address.phone":
               address.phone,
         
             status:
               "PENDING_PAYMENT",
         
             createdAt: {
               $gte: new Date(
                 Date.now() - 15 * 60 * 1000
               ),
             },
           });

     if (existingPending) {
        return NextResponse.json(
          {
            success: false,
            message:
              "You already have a pending payment order",
            orderId: existingPending.orderId,
          },
          {
            status: 409,
            headers: getCorsHeaders(origin),
          }
        );
      }
     
/* =========================================================
   RAZORPAY (HARDENED INIT)
========================================================= */

let razorpayOrder = null;

if (paymentMethod === "RAZORPAY") {
  try {
    /* ================= ENV VALIDATION ================= */

    if (
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET
    ) {
      console.error(
        "RAZORPAY ENV MISSING"
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Razorpay credentials missing",
        },
        {
          status: 500,
          headers: getCorsHeaders(origin),
        }
      );
    }

    /* ================= IMPORT ================= */

    const Razorpay =
      (await import("razorpay")).default;

    /* ================= INSTANCE ================= */

    const razorpay = new Razorpay({
      key_id:
        process.env.RAZORPAY_KEY_ID,

      key_secret:
        process.env
          .RAZORPAY_KEY_SECRET,
    });

    console.log(
      "CREATING RAZORPAY ORDER..."
    );

    console.log({
      amount:
        Math.round(amount * 100),

      receipt: orderId,
    });

    /* ================= CREATE ORDER ================= */

    razorpayOrder =
      await razorpay.orders.create({
        amount: Math.round(
          amount * 100
        ),

        currency: "INR",

        receipt: orderId,

        notes: {
          orderId,
        },
      });

    console.log(
      "RAZORPAY ORDER CREATED:",
      razorpayOrder
    );

    /* ================= VALIDATE ================= */

    if (!razorpayOrder?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Failed to create Razorpay order",
        },
        {
          status: 500,
          headers: getCorsHeaders(origin),
        }
      );
    }
   
 } catch (err: any) {
    console.error(
      "RAZORPAY ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to initialize payment gateway",
      },
      {
        status: 500,
        headers: getCorsHeaders(origin),
      }
    );
  }
}

      let gatewayOrderId = "";
      
      if (
        paymentMethod === "RAZORPAY" &&
        razorpayOrder?.id
      ) {
        gatewayOrderId = razorpayOrder.id;
      }     

 /* =========================================================
       ORDER CREATE (IMMUTABLE SNAPSHOT)
    ========================================================= */

    const order = await Order.create({
      source,
      orderId: {
        type: String,
        unique: true,
        index: true,
      },
       
      cart: processedCart,

      address,   

      subtotal,
      discount: finalDiscount,
      taxableAmount: subtotal,

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

      taxItems: processedCart,

      status: orderStatus,

      payment: {
        method: paymentMethod,
        status: paymentStatus,
        amountPaid: 0,
        gatewayOrderId: {
           type: String,
           sparse: true,
           unique: true,
         },
      },

      invoice: {
        invoiceType,
        pdfGenerated: false,
        locked: false,
      },

      paymentVerified: false,
      stockReserved: false,
      invoiceGenerated: false,
      shipmentCreated: false,
      locked: false,
      expiresAt: new Date(
        Date.now() + 15 * 60 * 1000
      ),

      events: [
        {
          type: "ORDER_CREATED",
          message: "Order created successfully",
          createdAt: new Date(),
        },
      ],
    });      

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
      { headers: getCorsHeaders(origin) }
    );
  } catch (err: any) {
    console.error("ORDER CREATE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message:
           err?.message ||
           "Internal Server Error",
      },
      {
        status: 500,
        headers: getCorsHeaders(origin),
      }
    );
  }
}
