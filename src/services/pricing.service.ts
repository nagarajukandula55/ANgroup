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
      (sum, item) =>
        sum + Number(item.baseTotal || 0),
      0
    );

    return items.map((item, index) => {

      const itemBaseTotal = Number(
        item.baseTotal || 0
      );

      // DISTRIBUTE DISCOUNT PROPORTIONALLY
      const ratio =
        subtotal > 0
          ? itemBaseTotal / subtotal
          : 0;

      const discount =
        index === items.length - 1
          ? money(totalDiscount - distributed)
          : money(totalDiscount * ratio);

      if (index !== items.length - 1) {
        distributed += discount;
      }

      // ENSURE NEVER NEGATIVE
      const taxableValue = money(
        Math.max(
          0,
          itemBaseTotal - discount
        )
      );

      return {
        ...item,

        discount,

        // PRICE AFTER DISCOUNT
        taxableValue,
      };
    });
  }

  /* =========================================================
     GST EXCLUSIVE
     GST APPLIED AFTER DISCOUNT
  ========================================================= */

  static applyGST(
    item: CartWithDiscount,
    gstMode: string
  ): CartWithGST {

    // FINAL TAXABLE VALUE
    const taxableValue = money(
      Number(item.taxableValue || 0)
    );

    // GST ON DISCOUNTED VALUE
    const gstAmount = money(
      taxableValue *
      (Number(item.gstRate || 0) / 100)
    );

    // GST SPLIT
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

    // FINAL PAYABLE AMOUNT
    const lineTotal = money(
      taxableValue + gstAmount
    );

    return {
      ...item,

      taxableValue,

      gstAmount,

      cgst,

      sgst,

      igst,

      lineTotal,
    };
  }
}
