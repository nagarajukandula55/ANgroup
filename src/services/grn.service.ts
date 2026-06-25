import GRN from "@/models/GRN";
import PurchaseOrder from "@/models/PurchaseOrder";
import MaterialPriceHistory from "@/models/MaterialPriceHistory";
import StockLedger from "@/models/StockLedger";

function generateGRNNumber() {
  return "GRN-" + Date.now();
}

/* =========================================================
🔥 CREATE GRN (PRODUCTION READY)
========================================================= */
export async function createGRN(payload: any) {
  const { poId, vendorId, items, businessId, createdBy, warehouseId } = payload;

  if (!poId || !vendorId || !items?.length) {
    throw new Error("poId, vendorId and items are required");
  }

  /* ================= FETCH PO ================= */
  const po = await PurchaseOrder.findById(poId);

  if (!po) {
    throw new Error("Purchase Order not found");
  }

  if (po.status === "CANCELLED") {
    throw new Error("Cannot create GRN for cancelled PO");
  }

  /* ================= CREATE GRN ================= */
  const grn = await GRN.create({
    grnNumber: generateGRNNumber(),
    poId,
    vendorId,
    items,
    businessId,
    createdBy,
  });

  /* =========================================================
  🔥 PROCESS ITEMS (STOCK + PRICE + VALIDATION)
  ========================================================= */
  for (const item of items) {
    const poItem = po.items.find(
      (p: any) => p.materialId.toString() === item.materialId.toString()
    );

    if (!poItem) {
      throw new Error(`Material not found in PO: ${item.materialId}`);
    }

    /* ================= TOTAL RECEIVED SO FAR ================= */
    const receivedAgg = await GRN.aggregate([
      { $match: { poId: po._id } },
      { $unwind: "$items" },
      {
        $match: {
          "items.materialId": item.materialId,
        },
      },
      {
        $group: {
          _id: "$items.materialId",
          totalReceived: { $sum: "$items.receivedQty" },
        },
      },
    ]);

    const alreadyReceived = receivedAgg[0]?.totalReceived || 0;
    const newTotal = alreadyReceived + item.receivedQty;

    /* ================= OVER RECEIPT CHECK ================= */
    if (newTotal > poItem.quantity) {
      throw new Error(
        `Over receipt not allowed for material ${item.materialId}`
      );
    }

    /* ================= STOCK IN ================= */
    await StockLedger.create({
      businessId,
      materialId: item.materialId,
      warehouseId,
      type: "IN",
      quantity: item.receivedQty,
      rate: item.unitPrice || 0,
      referenceType: "GRN",
      referenceId: grn._id,
      createdBy,
    });

    /* ================= PRICE HISTORY ================= */
    if (item.unitPrice) {
      await MaterialPriceHistory.create({
        businessId,
        materialId: item.materialId,
        vendorId,
        price: item.unitPrice,
        effectiveDate: new Date(),
        source: "GOODS_RECEIPT",
        sourceReferenceId: grn._id,
        sourceReferenceType: "GOODS_RECEIPT",
        createdBy,
      });
    }
  }

  /* =========================================================
  🔥 UPDATE PO STATUS (ACCURATE LOGIC)
  ========================================================= */
  const allGRNs = await GRN.find({ poId: po._id });

  const receivedMap = new Map<string, number>();

  allGRNs.forEach((grnDoc) => {
    grnDoc.items.forEach((it: any) => {
      const key = it.materialId.toString();
      receivedMap.set(
        key,
        (receivedMap.get(key) || 0) + it.receivedQty
      );
    });
  });

  const isFullyReceived = po.items.every((poItem: any) => {
    const received = receivedMap.get(poItem.materialId.toString()) || 0;
    return received >= poItem.quantity;
  });

  po.status = isFullyReceived ? "COMPLETED" : "PARTIALLY_RECEIVED";

  await po.save();

  return grn;
}

/* =========================================================
🔥 GET ALL GRNs
========================================================= */
export async function getAllGRNs() {
  return GRN.find()
    .populate("poId")
    .populate("vendorId")
    .populate("items.materialId")
    .sort({ createdAt: -1 });
}

/* =========================================================
🔥 GET GRN BY ID
========================================================= */
export async function getGRNById(id: string) {
  return GRN.findById(id)
    .populate("poId")
    .populate("vendorId")
    .populate("items.materialId");
}
