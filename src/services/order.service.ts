import Order from "@/models/Order";
import crypto from "crypto";

import { ProductService } from "./product.service";
import { PricingService } from "./pricing.service";

import { validateCoupon } from "@/lib/coupon";
import { getFinancialYear } from "@/lib/invoice/getFinancialYear";

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

type CartTaxedItem = CartBaseItem & {
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
    if (!Array.isArray(cart) || cart.length === 0) {
      throw new Error("Cart is empty");
    }

    const items = await Promise.all(
      cart.map(async (item) => {
        console.log("CHECKOUT ITEM:", item);

        const { product, qty } =
          await ProductService.resolveProduct(item);

        console.log("PRODUCT FOUND:", {
          id: product._id,
          productKey: product.productKey,
          name: product.name,
        });

        const price =
          ProductService.getPrice(product);

        return {
          productId: product._id.toString(),

          productKey:
            product.productKey || "",

          name: product.name || "Product",

          qty,

          sellingPrice: Number(price || 0),

          gstRate: Number(product.tax || 0),

          baseTotal: Number(price || 0) * qty,
        };
      })
    );

    return items;
  }

  /* =========================================================
     CREATE ORDER
  ========================================================= */

  static async createOrder(payload: any) {
    try {
      const {
        cart,
        address,
        coupon,
        paymentMethod,
        gstType,
        gstMode,
      } = payload;

      console.log("CREATE ORDER PAYLOAD:", payload);

      /* =====================================================
         STEP 1: BUILD CART
      ===================================================== */

      let items: CartBaseItem[] =
        await this.buildCart(cart);

      /* =====================================================
         STEP 2: SUBTOTAL
      ===================================================== */

      const subtotal = items.reduce(
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

        if (!couponResult?.valid) {
          throw new Error("Invalid coupon");
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
        discountedItems.map((item) => {
          const taxed =
            PricingService.applyGST(
              item,
              gstMode
            );
      
          return {
            ...taxed,
            price: taxed.sellingPrice,
          };
        });

      /* =====================================================
         STEP 6: TOTALS
      ===================================================== */

      const taxableAmount =
        taxedItems.reduce(
          (sum, item) =>
            sum + item.taxableValue,
          0
        );

      const gstTotal = taxedItems.reduce(
        (sum, item) =>
          sum + item.gstAmount,
        0
      );

      const amount = Math.max(
        1,
        Number(taxableAmount) +
          Number(gstTotal)
      );

      /* =====================================================
         STEP 7: ORDER ID
      ===================================================== */

      const orderId = `NA-ORD-${Date.now()}-${Math.floor(
        Math.random() * 9999
      )}`;

      /* =====================================================
         STEP 8: CREATE ORDER
      ===================================================== */

      const order = await Order.create({
        orderId,

        cart: taxedItems,

        address,

        subtotal,
        discount,

        taxableAmount,
        gstTotal,

        amount,

        paymentMethod,

        gstMode,

        invoice: {
          invoiceType:
            gstType === "B2B"
              ? "B2B"
              : "TAX",

          financialYear:
            getFinancialYear(),
        },

        orderHash: stableHash({
          orderId,
          taxedItems,
          amount,
        }),

        expiresAt: new Date(
          Date.now() + 15 * 60 * 1000
        ),
      });

      console.log(
        "ORDER CREATED SUCCESSFULLY:",
        orderId
      );

      return {
        success: true,
        orderId,
        amount,
        items: taxedItems,
        subtotal,
        discount,
        taxableAmount,
        gstTotal,
        cgst: taxedItems.reduce((s, i) => s + i.cgst, 0),
        sgst: taxedItems.reduce((s, i) => s + i.sgst, 0),
        igst: taxedItems.reduce((s, i) => s + i.igst, 0),
        razorpayOrder: {
          amount: amount * 100,
          currency: "INR",
          id: orderId,
        },
        order,
      };
    } catch (err: any) {
      console.error(
        "CREATE ORDER FAILED:",
        err
      );

      throw new Error(
        err.message || "Order creation failed"
      );
    }
  }
}
