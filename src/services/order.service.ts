import Order from "@/models/Order";
import crypto from "crypto";
import Razorpay from "razorpay";

import { ProductService } from "./product.service";
import { PricingService } from "./pricing.service";

import { validateCoupon } from "@/lib/coupon";
import { getFinancialYear } from "@/lib/invoice/getFinancialYear";

/* =========================================================
   RAZORPAY
========================================================= */

const razorpay = new Razorpay({
  key_id:
    process.env.RAZORPAY_KEY_ID!,

  key_secret:
    process.env.RAZORPAY_KEY_SECRET!,
});

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
        const couponResult =
          await validateCoupon(
            coupon,
            subtotal
          );

        if (
          !couponResult?.valid
        ) {
          throw new Error(
            "Invalid coupon"
          );
        }

        discount = Number(
          couponResult.discount ||
            0
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
            sum +
            item.taxableValue,
          0
        );

      const gstTotal =
        taxedItems.reduce(
          (sum, item) =>
            sum + item.gstAmount,
          0
        );

      const cgst =
        taxedItems.reduce(
          (sum, item) =>
            sum + item.cgst,
          0
        );

      const sgst =
        taxedItems.reduce(
          (sum, item) =>
            sum + item.sgst,
          0
        );

      const igst =
        taxedItems.reduce(
          (sum, item) =>
            sum + item.igst,
          0
        );

      const amount = Math.max(
        1,
        Number(
          (
            taxableAmount +
            gstTotal
          ).toFixed(2)
        )
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
        await razorpay.orders.create(
          {
            amount: Math.round(
              amount * 100
            ),

            currency: "INR",

            receipt: orderId,

            notes: {
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

          razorpayOrderId:
            razorpayOrder.id,

          cart: taxedItems,

          address,

          subtotal,

          discount,

          taxableAmount,

          gstTotal,

          cgst,

          sgst,

          igst,

          amount,

          paymentMethod,

          gstMode,

          paymentStatus:
            "PENDING",

          orderStatus:
            "CREATED",

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
          "Order creation failed"
      );
    }
  }
}
