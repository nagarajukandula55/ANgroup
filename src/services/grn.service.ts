import GRN from "@/models/GRN";
import PurchaseOrder from "@/models/PurchaseOrder";
import MaterialPriceHistory from "@/models/MaterialPriceHistory";

function generateGRNNumber() {
  return "GRN-" + Date.now();
}

/* ================= CREATE GRN ================= */
export async function createGRN(payload: any) {
  const { poId, vendorId, items, businessId, createdBy } = payload;

  const grn = await GRN.create({
    grnNumber: generateGRNNumber(),
    poId,
    vendorId,
    items,
    businessId,
    createdBy,
  });

  /* =========================================================
  🔥 PRICE HISTORY AUTO INSERT
  ========================================================= */
  for (const item of items) {
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
  🔥 UPDATE PO STATUS (PARTIAL LOGIC)
  ========================================================= */
  const po = await PurchaseOrder.findById(poId);

  if (po) {
    const allGRNs = await GRN.find({ poId });

    if (allGRNs.length === 1) {
      po.status = "PARTIALLY_RECEIVED";
    } else {
      po.status = "PARTIALLY_RECEIVED"; // later we can calculate FULLY RECEIVED
    }

    await po.save();
  }

  return grn;
}

/* ================= GET ALL GRN ================= */
export async function getAllGRNs() {
  return GRN.find()
    .populate("poId")
    .populate("vendorId")
    .populate("items.materialId")
    .sort({ createdAt: -1 });
}

/* ================= GET GRN BY ID ================= */
export async function getGRNById(id: string) {
  return GRN.findById(id)
    .populate("poId")
    .populate("vendorId")
    .populate("items.materialId");
}
