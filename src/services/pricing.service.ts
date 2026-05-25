import { money } from "@/utils/money";

import type {
  CartBaseItem,
  CartWithDiscount,
  CartWithGST,
} from "@/types/order.types";

export class PricingService {

  /* =========================================================
     APPLY DISCOUNT
  ========================================================= */

  static applyDiscount(
    items: CartBaseItem[],
    totalDiscount: number
  ): CartWithDiscount[] {

    let distributed = 0;

    const subtotal = items.reduce(
      (s, i) => s + i.baseTotal,
      0
    );

    return items.map((item, i) => {

      const ratio =
        subtotal > 0
          ? item.baseTotal / subtotal
          : 0;

      const discount =
        i === items.length - 1
          ? money(totalDiscount - distributed)
          : money(totalDiscount * ratio);

      if (i !== items.length - 1) {
        distributed += discount;
      }

      return {
        ...item,

        discount,

        // FINAL PRICE AFTER DISCOUNT
        taxableValue: money(
          item.baseTotal - discount
        ),
      };
    });
  }

  /* =========================================================
     GST INCLUSIVE
  ========================================================= */

  static applyGST(
    item: CartWithDiscount,
    gstMode: string
  ): CartWithGST {

    // FINAL PRICE AFTER DISCOUNT
    const finalPrice = money(
      item.taxableValue
    );

    // GST INCLUDED SPLIT
    const taxableValue = money(
      finalPrice *
        100 /
        (100 + item.gstRate)
    );

    const gstAmount = money(
      finalPrice - taxableValue
    );

    const cgst =
      gstMode === "CGST_SGST"
        ? money(gstAmount / 2)
        : 0;

    const sgst =
      gstMode === "CGST_SGST"
        ? money(gstAmount / 2)
        : 0;

    const igst =
      gstMode === "IGST"
        ? gstAmount
        : 0;

    return {
      ...item,

      taxableValue,

      gstAmount,

      cgst,

      sgst,

      igst,

      // IMPORTANT:
      // FINAL PRICE ALREADY INCLUDES GST
      lineTotal: finalPrice,
    };
  }
}
