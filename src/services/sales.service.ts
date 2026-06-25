import SalesInvoice from "@/models/SalesInvoice";
import { stockOut } from "@/services/stock.service";

function generateInvoiceNumber() {
  return "INV-" + Date.now();
}

/* =========================================================
🔥 CREATE SALES INVOICE (CORE FLOW)
========================================================= */
export async function createSalesInvoice(payload: any) {
  const {
    businessId,
    customerName,
    items,
    warehouseId,
    createdBy,
  } = payload;

  if (!items?.length) {
    throw new Error("Items required");
  }

  /* ================= CALCULATE TOTAL ================= */
  let totalAmount = 0;

  for (const item of items) {
    item.total = item.quantity * item.rate;
    totalAmount += item.total;
  }

  /* ================= CREATE INVOICE ================= */
  const invoice = await SalesInvoice.create({
    invoiceNumber: generateInvoiceNumber(),
    businessId,
    customerName,
    items,
    totalAmount,
    createdBy,
  });

  /* =========================================================
  🔥 STOCK OUT FOR EACH ITEM
  ========================================================= */
  for (const item of items) {
    await stockOut({
      businessId,
      materialId: item.materialId,
      warehouseId,
      quantity: item.quantity,
      referenceType: "SALES",
      referenceId: invoice._id,
      createdBy,
    });
  }

  return invoice;
}

/* =========================================================
📦 GET ALL INVOICES
========================================================= */
export async function getAllInvoices() {
  return SalesInvoice.find()
    .populate("items.materialId")
    .sort({ createdAt: -1 });
}

/* =========================================================
📄 GET INVOICE BY ID
========================================================= */
export async function getInvoiceById(id: string) {
  return SalesInvoice.findById(id).populate("items.materialId");
}
