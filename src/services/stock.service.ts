import StockLedger from "@/models/StockLedger";

/* =========================================================
IN STOCK (GRN → STOCK IN)
========================================================= */
export async function stockIn({
  businessId,
  materialId,
  warehouseId,
  quantity,
  rate = 0,
  referenceId,
  createdBy,
}: any) {
  return StockLedger.create({
    businessId,
    materialId,
    warehouseId,
    type: "IN",
    quantity,
    rate,
    referenceType: "GRN",
    referenceId,
    createdBy,
  });
}

/* =========================================================
OUT STOCK (SALES / CONSUMPTION)
========================================================= */
export async function stockOut({
  businessId,
  materialId,
  warehouseId,
  quantity,
  referenceType = "SALES",
  referenceId,
  createdBy,
}: any) {
  return StockLedger.create({
    businessId,
    materialId,
    warehouseId,
    type: "OUT",
    quantity,
    referenceType,
    referenceId,
    createdBy,
  });
}

/* =========================================================
GET CURRENT STOCK (AGGREGATED)
========================================================= */
export async function getCurrentStock({
  materialId,
  warehouseId,
}: any) {
  const result = await StockLedger.aggregate([
    {
      $match: {
        materialId,
        warehouseId,
      },
    },
    {
      $group: {
        _id: {
          materialId: "$materialId",
          warehouseId: "$warehouseId",
        },
        totalIn: {
          $sum: {
            $cond: [{ $eq: ["$type", "IN"] }, "$quantity", 0],
          },
        },
        totalOut: {
          $sum: {
            $cond: [{ $eq: ["$type", "OUT"] }, "$quantity", 0],
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
          $subtract: ["$totalIn", "$totalOut"],
        },
      },
    },
  ]);

  return result[0] || {
    materialId,
    warehouseId,
    availableStock: 0,
  };
}
