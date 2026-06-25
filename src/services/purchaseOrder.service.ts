import PurchaseOrder from "@/models/PurchaseOrder";

function generatePONumber() {
  return "PO-" + Date.now();
}

/* ================= CREATE PO ================= */
export async function createPurchaseOrder(payload: any) {
  const po = await PurchaseOrder.create({
    ...payload,
    poNumber: generatePONumber(),
  });

  return po;
}

/* ================= GET ALL PO ================= */
export async function getAllPurchaseOrders() {
  return PurchaseOrder.find()
    .populate("vendorId")
    .populate("items.materialId")
    .sort({ createdAt: -1 });
}

/* ================= GET SINGLE PO ================= */
export async function getPurchaseOrderById(id: string) {
  return PurchaseOrder.findById(id)
    .populate("vendorId")
    .populate("items.materialId");
}

/* ================= UPDATE PO ================= */
export async function updatePurchaseOrder(id: string, payload: any) {
  return PurchaseOrder.findByIdAndUpdate(id, payload, { new: true });
}

/* ================= APPROVE PO ================= */
export async function approvePurchaseOrder(id: string) {
  return PurchaseOrder.findByIdAndUpdate(
    id,
    { status: "APPROVED" },
    { new: true }
  );
}
