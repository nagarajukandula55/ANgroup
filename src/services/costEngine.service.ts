import VendorProductBOM from "@/models/VendorProductBOM";
import VendorProduct from "@/models/VendorProduct";

export async function recalcVendorProductCost(
  vendorProductId: string
) {
  const bomItems =
    await VendorProductBOM.find({
      vendorProductId,
      active: true,
    });

  let totalCost = 0;

  for (const item of bomItems) {
    const qty = Number(item.quantity || 0);
    const rate = Number(item.currentRate || 0);
    const wastage =
      Number(item.wastagePercent || 0);

    const baseCost = qty * rate;

    const wastageCost =
      baseCost * (wastage / 100);

    totalCost += baseCost + wastageCost;
  }

  const currentCost = totalCost;

  const safeCost =
    totalCost * 1.1; // +10% buffer

  const worstCost =
    totalCost * 1.25; // +25% risk buffer

  await VendorProduct.findByIdAndUpdate(
    vendorProductId,
    {
      calculatedCurrentCost: currentCost,
      calculatedSafeCost: safeCost,
      calculatedWorstCost: worstCost,

      // optional sync to main cost field
      vendorCost: currentCost,
    }
  );

  return {
    currentCost,
    safeCost,
    worstCost,
  };
}
