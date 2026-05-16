import Order from "@/models/Order";
import crypto from "crypto";
import { ProductService } from "./product.service";
import { PricingService } from "./pricing.service";
import { validateCoupon } from "@/lib/coupon";
import { getFinancialYear } from "@/lib/invoice/getFinancialYear";

function stableHash(obj: any) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(obj, Object.keys(obj).sort()))
    .digest("hex");
}

/* =========================================================
   TYPES (local safe declaration)
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

  /* -------------------------------
     BUILD CART (DB SAFE)
  ------------------------------- */
  static async buildCart(cart: any[]): Promise<CartBaseItem[]> {
    return Promise.all(
      cart.map(async (item) => {
        const { product, qty } =
          await ProductService.resolveProduct(item);

        const price = ProductService.getPrice(product);

        return {
          productId: product._id.toString(),
          productKey: product.productKey,
          name: product.name,
          qty,
          sellingPrice: price,
          gstRate: product.tax ?? 0,
          baseTotal: price * qty,
        };
      })
    );
  }

  /* -------------------------------
     CREATE ORDER (PIPELINE FIXED)
  ------------------------------- */
  static async createOrder(payload: any) {
    const {
      cart,
      address,
      coupon,
      paymentMethod,
      gstType,
      gstMode,
    } = payload;

    /* STEP 1: BASE CART */
    let items: CartBaseItem[] = await this.buildCart(cart);

    const subtotal = items.reduce((s, i) => s + i.baseTotal, 0);

    /* STEP 2: DISCOUNT */
    let discount = 0;

    if (coupon) {
      const res = await validateCoupon(coupon, subtotal);
      if (!res?.valid) throw new Error("Invalid coupon");
      discount = Number(res.discount || 0);
    }

    const discountedItems = PricingService.applyDiscount(items, discount);

    /* STEP 3: GST CALCULATION (FINAL STATE) */
    const taxedItems: CartTaxedItem[] =
      discountedItems.map((i) =>
        PricingService.applyGST(i, gstMode)
      );

    /* STEP 4: TOTALS */
    const taxableAmount = taxedItems.reduce(
      (s, i) => s + i.taxableValue,
      0
    );

    const gstTotal = taxedItems.reduce(
      (s, i) => s + i.gstAmount,
      0
    );

    const amount = Math.max(1, taxableAmount + gstTotal);

    /* STEP 5: ORDER ID */
    const orderId = `NA-ORD-${Date.now()}-${Math.floor(
      Math.random() * 9999
    )}`;

    /* STEP 6: ORDER CREATE */
    const order = await Order.create({
      orderId,
      cart: taxedItems,
      address,

      subtotal,
      discount,
      taxableAmount,
      gstTotal,
      amount,

      gstMode,

      invoice: {
        invoiceType: gstType === "B2B" ? "B2B" : "TAX",
        financialYear: getFinancialYear(),
      },

      orderHash: stableHash({
        orderId,
        taxedItems,
        amount,
      }),

      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    return { orderId, amount, items: taxedItems, order };
  }
}
