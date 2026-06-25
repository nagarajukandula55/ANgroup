import StockLedger from "@/models/StockLedger";

/* =========================================================
🧠 GET STOCK + VALUE (MOVING AVERAGE MODEL)
========================================================= */
export async function getStockValuation({
  businessId,
  materialId,
  warehouseId,
}: any) {
  const match: any = {};

  if (businessId) match.businessId = businessId;
  if (materialId) match.materialId = materialId;
  if (warehouseId) match.warehouseId = warehouseId;

  const result = await StockLedger.aggregate([
    { $match: match },

    {
      $group: {
        _id: {
          materialId: "$materialId",
          warehouseId: "$warehouseId",
        },

        totalInQty: {
          $sum: {
            $cond: [{ $eq: ["$type", "IN"] }, "$quantity", 0],
          },
        },

        totalOutQty: {
          $sum: {
            $cond: [{ $eq: ["$type", "OUT"] }, "$quantity", 0],
          },
        },

        totalInValue: {
          $sum: {
            $cond: [
              { $eq: ["$type", "IN"] },
              { $multiply: ["$quantity", "$rate"] },
              0,
            ],
          },
        },
      },
    },

    {
      $project: {
        _id: 0,
        materialId: "$_id.materialId",
        warehouseId: "$_id.warehouseId",

        availableStock: {
          $subtract: ["$totalInQty", "$totalOutQty"],
        },

        avgCost: {
          $cond: [
            { $gt: ["$totalInQty", 0] },
            { $divide: ["$totalInValue", "$totalInQty"] },
            0,
          ],
        },
      },
    },
  ]);

  return result;
}
