import { money } from "@/utils/money";
import type { CartBaseItem, CartWithDiscount, CartWithGST } from "@/types/order.types";

export class PricingService {

  static applyDiscount(items: CartBaseItem[], totalDiscount: number): CartWithDiscount[] {
    let distributed = 0;

    const subtotal = items.reduce((s, i) => s + i.baseTotal, 0);

    return items.map((item, i) => {
      const ratio = subtotal > 0 ? item.baseTotal / subtotal : 0;

      const discount =
        i === items.length - 1
          ? money(totalDiscount - distributed)
          : money(totalDiscount * ratio);

      if (i !== items.length - 1) distributed += discount;

      return {
        ...item,
        discount,
        taxableValue: money(item.baseTotal - discount),
      };
    });
  }

  static applyGST(
    item: CartWithDiscount,
    gstMode: string
  ): CartWithGST {
    const rawGST = item.taxableValue * (item.gstRate / 100);

    const gstAmount = money(rawGST);

    const cgst = gstMode === "CGST_SGST" ? money(rawGST / 2) : 0;
    const sgst = gstMode === "CGST_SGST" ? money(rawGST / 2) : 0;
    const igst = gstMode === "IGST" ? gstAmount : 0;

    return {
      ...item,
      gstAmount,
      cgst,
      sgst,
      igst,
      lineTotal: money(item.taxableValue + gstAmount),
    };
  }
}
