import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { connectNativeDB } from "@/lib/native-mongodb";
import { getProductModel } from "@/models/Product";
import { validateCoupon } from "@/lib/coupon";
import crypto from "crypto";
import { getFinancialYear } from "@/lib/invoice/getFinancialYear";

/* =========================================================
   NATIVE DB CONNECTION (PRODUCT DB)
========================================================= */

const nativeConn = await connectNativeDB();
const Product = getProductModel(nativeConn);

/* =========================================================
   TYPES (CRITICAL FIX FOR TS + LINT)
========================================================= */

type NativeProduct = {
  _id: any;
  productKey: string;
  name: string;
  tax?: number;
  primaryVariant?: {
    price?: number;
    mrp?: number;
  };
  pricing?: {
    sellingPrice?: number;
    mrp?: number;
  };
};

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  "https://shopnative.in",
  "https://www.shopnative.in",
];

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const getCorsHeaders = (origin?: string | null) => ({
  ...corsHeaders,
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin)
      ? origin
      : "https://shopnative.in",
});

/* =========================================================
   OPTIONS
========================================================= */

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  return NextResponse.json({}, {
    headers: {
      ...corsHeaders,
      "Access-Control-Allow-Origin":
        origin && allowedOrigins.includes(origin)
          ? origin
          : "https://shopnative.in",
    },
  });
}

/* =========================================================
   HELPERS
========================================================= */

async function generateOrderId() {
  const now = new Date();

  return (
    "NA-ORD-" +
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0") +
    "-" +
    Math.floor(Math.random() * 9000 + 1000)
  );
}

function stableHash(obj: any) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(obj, Object.keys(obj).sort()))
    .digest("hex");
}

const money = (v: number) => Number(v.toFixed(2));

const isObjectId = (id: string) =>
  /^[0-9a-fA-F]{24}$/.test(id);

/* =========================================================
   MAIN API
========================================================= */

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      source = "NATIVE",
      cart,
      address,
      paymentMethod,
      coupon = "",
      gstType = "B2C",
    } = body;

    const origin = req.headers.get("origin");

    const isAllowedOrigin =
      !!origin && allowedOrigins.includes(origin);

    if (!isAllowedOrigin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized origin" },
        { status: 403, headers: getCorsHeaders(origin) }
      );
    }

    /* =========================================================
       VALIDATION
    ========================================================= */

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart empty" },
        { status: 400 }
      );
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    const pincodeRegex = /^\d{6}$/;

    if (
      !address?.name ||
      !address?.phone ||
      !address?.address ||
      !address?.city ||
      !address?.state ||
      !address?.pincode
    ) {
      return NextResponse.json(
        { success: false, message: "Incomplete address" },
        { status: 400 }
      );
    }

    if (!phoneRegex.test(address.phone)) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number" },
        { status: 400 }
      );
    }

    if (!pincodeRegex.test(address.pincode)) {
      return NextResponse.json(
        { success: false, message: "Invalid pincode" },
        { status: 400 }
      );
    }

    const allowedPaymentMethods = ["RAZORPAY", "UPI"];

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, message: "Invalid payment method" },
        { status: 400 }
      );
    }

    const COMPANY_STATE = "Andhra Pradesh";

    const isInterState =
      address.state?.trim()?.toLowerCase() !==
      COMPANY_STATE.toLowerCase();

    const gstMode = isInterState ? "IGST" : "CGST_SGST";

    /* =========================================================
       PRODUCT FETCH (SAFE PER ITEM, NO DUPLICATE VARS)
    ========================================================= */

    const processedCartRaw = await Promise.all(
      cart.map(async (item: any) => {
        const qty = Number(item.qty);

        if (!item.productId || !qty || qty <= 0) {
          throw new Error("Invalid cart item");
        }

        const id = item.productId || item._id;

        let product: NativeProduct | null = null;

        /* 1. ObjectId */
        if (id && isObjectId(id)) {
          product = await Product.findById(id).lean<NativeProduct>();
        }

        /* 2. productKey (PRIMARY) */
        if (!product && item.productKey) {
          product = await Product.findOne({
            productKey: item.productKey,
          }).lean<NativeProduct>();
        }

        /* 3. SAFE fallback (NO guessing) */
        if (!product && typeof id === "string" && item.productKey) {
          product = await Product.findOne({
            productKey: item.productKey,
          }).lean<NativeProduct>();
        }

        if (!product) {
          console.error("PRODUCT NOT FOUND:", item);
          throw new Error("Product not found");
        }

        const price =
          product.primaryVariant?.price ??
          product.pricing?.sellingPrice;

        if (price == null) {
          throw new Error(`Missing price for ${product.productKey}`);
        }

        return {
          productId: product._id.toString(),
          productKey: product.productKey,
          name: product.name,
          qty,

          sellingPrice: price,
          mrp:
            product.primaryVariant?.mrp ??
            product.pricing?.mrp ??
            0,

          gstRate: product.tax ?? 0,

          baseTotal: money(price * qty),
        };
      })
    );

    /* =========================================================
       TOTALS
    ========================================================= */

    const subtotalBeforeDiscount = processedCartRaw.reduce(
      (s, i) => s + i.baseTotal,
      0
    );

    let couponDiscount = 0;

    if (coupon) {
      const result = await validateCoupon(
        coupon,
        subtotalBeforeDiscount
      );

      if (!result?.valid) {
        return NextResponse.json(
          { success: false, message: "Invalid coupon" },
          { status: 400 }
        );
      }

      couponDiscount = Number(result.discount || 0);
    }

    const finalDiscount = Math.min(
      couponDiscount,
      subtotalBeforeDiscount
    );

    let distributed = 0;

    const processedCart = processedCartRaw.map((item, i) => {
      const ratio =
        subtotalBeforeDiscount > 0
          ? item.baseTotal / subtotalBeforeDiscount
          : 0;

      let discount =
        i === processedCartRaw.length - 1
          ? money(finalDiscount - distributed)
          : money(finalDiscount * ratio);

      if (i !== processedCartRaw.length - 1) {
        distributed += discount;
      }

      const taxableValue = money(item.baseTotal - discount);

      const gstAmount = money(
        taxableValue * (item.gstRate / 100)
      );

      const cgst =
        gstMode === "CGST_SGST" ? money(gstAmount / 2) : 0;

      const sgst =
        gstMode === "CGST_SGST"
          ? money(gstAmount - cgst)
          : 0;

      const igst =
        gstMode === "IGST" ? gstAmount : 0;

      return {
        ...item,
        price: item.sellingPrice,
        discount,
        taxableValue,
        gstAmount,
        cgst,
        sgst,
        igst,
        lineTotal: money(taxableValue + gstAmount),
      };
    });

    const subtotal = processedCart.reduce((s, i) => s + i.baseTotal, 0);
    const taxableAmount = processedCart.reduce((s, i) => s + i.taxableValue, 0);
    const gstTotal = processedCart.reduce((s, i) => s + i.gstAmount, 0);

    const amount = money(
      Math.max(1, taxableAmount + gstTotal)
    );

    /* =========================================================
       ORDER ID (SAFE)
    ========================================================= */

    const orderId = await generateOrderId();

    /* =========================================================
       ORDER CREATE
    ========================================================= */

    const order = await Order.create({
      source,
      orderId,
      cart: processedCart,
      address,

      subtotal,
      discount: finalDiscount,
      taxableAmount,
      gstTotal,
      amount,

      gstMode,

      payment: {
        method: paymentMethod,
        status: paymentMethod === "RAZORPAY" ? "INITIATED" : "PENDING",
      },

      invoice: {
        invoiceType: gstType === "B2B" ? "B2B" : "TAX",
        financialYear: getFinancialYear(),
      },

      orderHash: stableHash({ orderId, processedCart, amount }),

      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    return NextResponse.json({
      success: true,
      orderId,
      amount,
      items: processedCart,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
