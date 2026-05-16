import Order from "@/models/Order";
import crypto from "crypto";
import { ProductService } from "./product.service";
import { PricingService } from "./pricing.service";
import { validateCoupon } from "@/lib/coupon";
import { getFinancialYear } from "@/lib/invoice/getFinancialYear";

function stableHash(obj: any) {
  return crypto.createHash("sha256")
    .update(JSON.stringify(obj, Object.keys(obj).sort()))
    .digest("hex");
}

export class OrderService {
  static async buildCart(cart: any[], gstMode: string) {
    const raw = await Promise.all(
      cart.map(async (item) => {
        const { product, qty } = await ProductService.resolveProduct(item);

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

    return raw;
  }

  static async createOrder(payload: any) {
    const {
      cart,
      address,
      coupon,
      paymentMethod,
      gstType,
      gstMode,
    } = payload;

    let items = await this.buildCart(cart, gstMode);

    const subtotal = items.reduce((s, i) => s + i.baseTotal, 0);

    let discount = 0;

    if (coupon) {
      const res = await validateCoupon(coupon, subtotal);
      if (!res?.valid) throw new Error("Invalid coupon");
      discount = Number(res.discount || 0);
    }

    items = PricingService.applyDiscount(items, discount);

    items = items.map((i) => PricingService.applyGST(i, gstMode));

    const taxable = items.reduce((s, i) => s + i.taxableValue, 0);
    const gst = items.reduce((s, i) => s + i.gstAmount, 0);

    const amount = Math.max(1, taxable + gst);

    const orderId = `NA-ORD-${Date.now()}-${Math.floor(Math.random()*9999)}`;

    const order = await Order.create({
      orderId,
      cart: items,
      address,

      subtotal,
      discount,
      taxableAmount: taxable,
      gstTotal: gst,
      amount,

      gstMode,

      invoice: {
        invoiceType: gstType === "B2B" ? "B2B" : "TAX",
        financialYear: getFinancialYear(),
      },

      orderHash: stableHash({ orderId, items, amount }),

      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    return { orderId, amount, items, order };
  }
}
