import { money } from "@/utils/money";

export class PricingService {
  static applyDiscount(items: any[], totalDiscount: number) {
    let distributed = 0;

    return items.map((item, i) => {
      const ratio =
        item.baseTotal / items.reduce((s, x) => s + x.baseTotal, 0);

      const discount =
        i === items.length - 1
          ? money(totalDiscount - distributed)
          : money(totalDiscount * ratio);

      if (i !== items.length - 1) distributed += discount;

      const taxableValue = money(item.baseTotal - discount);

      return { ...item, discount, taxableValue };
    });
  }

  static applyGST(item: any, gstMode: string) {
    const raw = item.taxableValue * (item.gstRate / 100);

    const gstAmount = money(raw);

    return {
      ...item,
      gstAmount,
      cgst: gstMode === "CGST_SGST" ? money(raw / 2) : 0,
      sgst: gstMode === "CGST_SGST" ? money(raw / 2) : 0,
      igst: gstMode === "IGST" ? gstAmount : 0,
      lineTotal: money(item.taxableValue + gstAmount),
    };
  }
}
