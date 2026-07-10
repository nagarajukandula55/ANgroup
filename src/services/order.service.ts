import Order from "@/models/Order";
import crypto from "crypto";
import Razorpay from "razorpay";

// This service exclusively creates orders for the Native storefront (order
// IDs are always "NA-ORD-...", project.code defaults to "NATIVE"), but the
// Order.create() call below never stamped a businessId onto the resulting
// document — found via a live-data audit that turned up a real PAID order
// with no businessId at all, invisible to any business-scoped admin view.
// Hardcoded here (not read from env) to match how storefront read routes
// (api/storefront/products, api/products/[slug]) already require this
// exact id as a query param — see angroup-architecture-decisions memory.
const NATIVE_BUSINESS_ID = "6a4abddcf35feedb2392f556";

import { ProductService } from "./product.service";
import { PricingService } from "./pricing.service";

// import { validateCoupon } from "@/lib/coupon";
// Was @/lib/invoice/getFinancialYear — one of 3 duplicate FY calculators
// consolidated during the numbering-engine cleanup (see
// core/numbering/financialYear.ts). Same "2026-27" output format, safe
// drop-in replacement.
import { getFinancialYear } from "@/core/numbering/financialYear";

/* =========================================================
   RAZORPAY
========================================================= */

// Was instantiated eagerly at module load with a non-null assertion on env
// vars that may not be set (e.g. a build/deploy without payment credentials
// configured yet) -- Razorpay's constructor throws immediately without
// key_id/key_secret, and since Next.js imports every route module during
// its build-time page-data-collection step, this crashed the ENTIRE
// production build, not just requests that actually create an order. Lazy
// singleton instead: only constructed the first time an order is actually
// created, so the rest of the app builds/runs fine without these creds set.
let razorpayClient: Razorpay | null = null;
function getRazorpay(): Razorpay {
  if (!razorpayClient) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay is not configured: RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET are missing.");
    }
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
}

/* =========================================================
   HASH
========================================================= */

function stableHash(obj: any) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(obj))
    .digest("hex");
}

/* =========================================================
   TYPES
========================================================= */

type CartBaseItem = {
  productId: string;

  productKey: string;

  name: string;

  qty: number;

  sellingPrice: number;

  gstRate: number;

  baseTotal: number;
};

type CartTaxedItem =
  CartBaseItem & {
    price: number;

    discount: number;

    taxableValue: number;

    gstAmount: number;

    cgst: number;

    sgst: number;

    igst: number;

    lineTotal: number;
  };

/* =========================================================
   ORDER SERVICE
========================================================= */

export class OrderService {
  /* =========================================================
     BUILD CART
  ========================================================= */

  static async buildCart(
    cart: any[]
  ): Promise<CartBaseItem[]> {
    if (
      !Array.isArray(cart) ||
      cart.length === 0
    ) {
      throw new Error(
        "Cart is empty"
      );
    }

    const items =
      await Promise.all(
        cart.map(async (item) => {
          console.log(
            "CHECKOUT ITEM:",
            item
          );

          const {
            product,
            qty,
          } =
            await ProductService.resolveProduct(
              item
            );

          console.log(
            "PRODUCT FOUND:",
            {
              id: product._id,

              productKey:
                product.productKey,

              name: product.name,
            }
          );

          const price =
            ProductService.getPrice(
              product
            );

          return {
            productId:
              product._id.toString(),

            productKey:
              product.productKey ||
              "",

            name:
              product.name ||
              "Product",

            qty,

            sellingPrice:
              Number(price || 0),

            gstRate: Number(
              product.tax || 0
            ),

            baseTotal:
              Number(price || 0) *
              qty,
          };
        })
      );

    return items;
  }

  /* =========================================================
     CREATE ORDER
  ========================================================= */

  static async createOrder(
    payload: any
  ) {
    try {
      const {
        cart,
        address,
        coupon,
        paymentMethod,
        gstType,
        gstMode,
      } = payload;

      console.log(
        "CREATE ORDER PAYLOAD:",
        payload
      );

      /* =====================================================
         STEP 1: BUILD CART
      ===================================================== */

      let items: CartBaseItem[] =
        await this.buildCart(cart);

      /* =====================================================
         STEP 2: SUBTOTAL
      ===================================================== */

      const subtotal =
        items.reduce(
          (sum, item) =>
            sum + item.baseTotal,
          0
        );

      /* =====================================================
         STEP 3: COUPON
      ===================================================== */
      
      let discount = 0;
      
      if (coupon) {
      
        console.log(
          "VALIDATING COUPON:",
          coupon
        );
      
        console.log(
          "NATIVE API:",
          process.env.NATIVE_API_URL
        );
      
        const couponRes = await fetch(
          `${process.env.NATIVE_API_URL}/api/coupons/validate`,
          {
            method: "POST",
      
            headers: {
              "Content-Type":
                "application/json",
            },
      
            body: JSON.stringify({
              code: coupon,
              subtotal,
            }),
          }
        );
      
        console.log(
          "COUPON STATUS:",
          couponRes.status
        );
      
        const couponResult =
          await couponRes.json();
      
        console.log(
          "COUPON RESPONSE:",
          couponResult
        );
      
        if (
          !couponResult?.success
        ) {
          throw new Error(
            couponResult.message ||
            "Invalid coupon"
          );
        }
      
        discount = Number(
          couponResult.discount || 0
        );
      }
      /* =====================================================
         STEP 4: APPLY DISCOUNT
      ===================================================== */

      const discountedItems =
        PricingService.applyDiscount(
          items,
          discount
        );

      /* =====================================================
         STEP 5: GST
      ===================================================== */

      const taxedItems: CartTaxedItem[] =
        discountedItems.map(
          (item) => {
            const taxed =
              PricingService.applyGST(
                item,
                gstMode
              );

            return {
              ...taxed,

              price:
                taxed.sellingPrice,
            };
          }
        );

      /* =====================================================
         STEP 6: GST SPLIT
      ===================================================== */

      const sellerState =
        "Andhra Pradesh";

      const customerState =
        address?.state || "";

      const isSameState =
        sellerState
          .toLowerCase()
          .trim() ===
        customerState
          .toLowerCase()
          .trim();

      taxedItems.forEach(
        (item) => {
          if (isSameState) {
            item.cgst = Number(
              (
                item.gstAmount / 2
              ).toFixed(2)
            );

            item.sgst = Number(
              (
                item.gstAmount / 2
              ).toFixed(2)
            );

            item.igst = 0;
          } else {
            item.cgst = 0;

            item.sgst = 0;

            item.igst = Number(
              item.gstAmount.toFixed(
                2
              )
            );
          }
        }
      );

      /* =====================================================
         STEP 7: TOTALS
      ===================================================== */

      const taxableAmount =
        taxedItems.reduce(
          (sum, item) =>
            sum + Number(item.taxableValue || 0),
          0
        );
      
      const gstTotal =
        taxedItems.reduce(
          (sum, item) =>
            sum + Number(item.gstAmount || 0),
          0
        );
      
      const cgst =
        taxedItems.reduce(
          (sum, item) =>
            sum + Number(item.cgst || 0),
          0
        );
      
      const sgst =
        taxedItems.reduce(
          (sum, item) =>
            sum + Number(item.sgst || 0),
          0
        );
      
      const igst =
        taxedItems.reduce(
          (sum, item) =>
            sum + Number(item.igst || 0),
          0
        );
      
      /* IMPORTANT:
         FINAL PAYABLE AMOUNT
         SHOULD COME FROM lineTotal
      */
      
      const amount =
        taxedItems.reduce(
          (sum, item) =>
            sum + Number(item.lineTotal || 0),
          0
        );

      /* =====================================================
         STEP 8: ORDER ID
      ===================================================== */

      const orderId = `NA-ORD-${Date.now()}-${Math.floor(
        Math.random() * 9999
      )}`;

      /* =====================================================
         STEP 9: CREATE RAZORPAY ORDER
      ===================================================== */

      const razorpayOrder =
        await getRazorpay().orders.create(
          {
            amount: Math.round(
              amount * 100
            ),

            currency: "INR",

            receipt: orderId,

            notes: {
              // /api/webhooks/razorpay's processSuccessfulPayment (and its
              // payment.failed/payment.authorized handlers) look up the
              // order via payment.notes.orderId -- keep this key in sync
              // with that reader. internalOrderId is kept alongside for
              // any other consumer that may already depend on it.
              orderId,
              internalOrderId:
                orderId,
            },
          }
        );

      console.log(
        "RAZORPAY ORDER CREATED:",
        razorpayOrder.id
      );

      /* =====================================================
         STEP 10: CREATE ORDER
      ===================================================== */

      const order =
        await Order.create({
          orderId,

          businessId: NATIVE_BUSINESS_ID,

          cart: taxedItems,
      
          address,
      
          subtotal,
      
          discount,

          couponCode: coupon || null,

          couponDiscount: discount || 0,
      
          taxableAmount,
      
          gstTotal,
      
          cgst,
      
          sgst,
      
          igst,
      
          amount,
      
          gstMode,
      
          status: "CREATED",
      
          paymentVerified: false,
      
          payment: {
            method:
              paymentMethod || "RAZORPAY",
      
            status: "PENDING",
      
            gateway: "RAZORPAY",
      
            gatewayOrderId:
              razorpayOrder.id,
          },
      
          invoice: {
            invoiceType:
              gstType === "B2B"
                ? "B2B"
                : "TAX",
      
            financialYear:
              getFinancialYear(),
          },
      
          orderHash:
            stableHash({
              orderId,
      
              taxedItems,
      
              amount,
            }),
      
          expiresAt: new Date(
            Date.now() +
              15 *
                60 *
                1000
          ),
        });

      console.log(
        "ORDER CREATED SUCCESSFULLY:",
        orderId
      );

      /* =====================================================
         STEP 11: RETURN
      ===================================================== */

      return {
        success: true,

        orderId,

        amount,

        items: taxedItems,

        subtotal,

        discount,

        taxableAmount,

        gstTotal,

        cgst,

        sgst,

        igst,

        razorpayOrder: {
          id: razorpayOrder.id,

          amount:
            razorpayOrder.amount,

          currency:
            razorpayOrder.currency,
        },

        order,
      };
    } catch (err: any) {
      console.error(
        "CREATE ORDER FAILED:",
        err
      );

      throw new Error(
        err.message ||
          "Order creation failed now"
      );
    }
  }
}
