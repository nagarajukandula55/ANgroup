import Sequence from "@/models/Sequence";

/* =========================================================
   RANDOM STRING
========================================================= */

function randomString(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return result;
}

/* =========================================================
   DATE
========================================================= */

function getDateCode() {
  const d = new Date();

  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yy}${mm}${dd}`;
}

/* =========================================================
   FINANCIAL YEAR
========================================================= */

function getFinancialYear() {
  const now = new Date();

  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }

  return `${year - 1}-${String(year).slice(-2)}`;
}

/* =========================================================
   GENERIC SEQUENCE
========================================================= */

async function generateSequence(
  business: any,
  documentType: string,
  defaultPrefix: string,
  options?: {
    includeDate?: boolean;
    includeRandom?: boolean;
    sequenceLength?: number;
  }
) {
  if (!business?._id) {
    throw new Error("Business is required");
  }

  const includeDate = options?.includeDate ?? false;
  const includeRandom = options?.includeRandom ?? false;
  const sequenceLength = options?.sequenceLength ?? 6;

  const financialYear = getFinancialYear();
  const dateKey = includeDate ? getDateCode() : "";

  const prefix =
    business?.documents?.[documentType]?.numbering?.prefix ||
    defaultPrefix;

  const seq = await Sequence.findOneAndUpdate(
    {
      businessId: business._id,
      documentType,
      financialYear,
      dateKey,
    },
    {
      $inc: {
        value: 1,
      },
      $setOnInsert: {
        businessId: business._id,
        documentType,
        prefix,
        financialYear,
        dateKey,
      },
    },
    {
      upsert: true,
      new: true,
    }
  );

  const sequence = String(seq.value).padStart(
    sequenceLength,
    "0"
  );

  let number = `${prefix}-${sequence}`;

  if (includeDate) {
    number = `${prefix}-${dateKey}-${sequence}`;
  }

  if (includeRandom) {
    number += `-${randomString(6)}`;
  }

  return number;
}

/* =========================================================
   PURCHASE ORDER
========================================================= */

export async function generatePurchaseOrderNumber(
  business: any
) {
  return generateSequence(
    business,
    "PURCHASE_ORDER",
    "PO"
  );
}

/* =========================================================
   GOODS RECEIPT
========================================================= */

export async function generateGRNNumber(
  business: any
) {
  return generateSequence(
    business,
    "GOODS_RECEIPT",
    "GRN"
  );
}

/* =========================================================
   SALES ORDER
========================================================= */

export async function generateSalesOrderNumber(
  business: any
) {
  return generateSequence(
    business,
    "SALES_ORDER",
    "SO"
  );
}

/* =========================================================
   PRODUCT
========================================================= */

export async function generateProductCode(
  business: any
) {
  return generateSequence(
    business,
    "PRODUCT",
    "PRD"
  );
}

/* =========================================================
   PRODUCT VARIANT
========================================================= */

export async function generateVariantCode(
  business: any
) {
  return generateSequence(
    business,
    "PRODUCT_VARIANT",
    "VAR"
  );
}

/* =========================================================
   VENDOR PRODUCT
========================================================= */

export async function generateVendorProductCode(
  business: any
) {
  return generateSequence(
    business,
    "VENDOR_PRODUCT",
    "VPRD"
  );
}

/* =========================================================
   STOCK ADJUSTMENT
========================================================= */

export async function generateStockAdjustmentNumber(
  business: any
) {
  return generateSequence(
    business,
    "STOCK_ADJUSTMENT",
    "SA"
  );
}

/* =========================================================
   STOCK TRANSFER
========================================================= */

export async function generateTransferNumber(
  business: any
) {
  return generateSequence(
    business,
    "STOCK_TRANSFER",
    "TRF"
  );
}

/* =========================================================
   PRODUCTION ORDER
========================================================= */

export async function generateProductionOrderNumber(
  business: any
) {
  return generateSequence(
    business,
    "PRODUCTION_ORDER",
    "MO"
  );
}

/* =========================================================
   BATCH
========================================================= */

export async function generateBatchNumber(
  business: any
) {
  return generateSequence(
    business,
    "BATCH",
    "BAT",
    {
      includeDate: true,
    }
  );
}

/* =========================================================
   CUSTOMER ORDER
========================================================= */

export async function generateCustomerOrderNumber(
  business: any
) {
  return generateSequence(
    business,
    "CUSTOMER_ORDER",
    "ORD"
  );
}

/* =========================================================
   CREDIT NOTE
========================================================= */

export async function generateCreditNoteNumber(
  business: any
) {
  return generateSequence(
    business,
    "CREDIT_NOTE",
    "CN"
  );
}

/* =========================================================
   DEBIT NOTE
========================================================= */

export async function generateDebitNoteNumber(
  business: any
) {
  return generateSequence(
    business,
    "DEBIT_NOTE",
    "DN"
  );
}

/* =========================================================
   INVOICE
========================================================= */

export async function generateInvoiceNumber(
  business: any
) {
  return generateSequence(
    business,
    "INVOICE",
    "INV",
    {
      includeDate: true,
      includeRandom: true,
    }
  );
}

/* =========================================================
   RECEIPT
========================================================= */

export async function generateReceiptNumber(
  business: any
) {
  return generateSequence(
    business,
    "RECEIPT",
    "RCT",
    {
      includeRandom: true,
    }
  );
}
