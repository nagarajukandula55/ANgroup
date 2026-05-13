import Business from "@/models/Business";
import UserBusinessAccess from "@/models/UserBusinessAccess";

/* ================= RESOLVE BUSINESS CONTEXT ================= */
export async function resolveBusinessContext(
  userId: string,
  businessId: string
) {
  if (!userId || !businessId) {
    throw new Error("INVALID_CONTEXT_INPUT");
  }

  /* ================= FETCH BUSINESS ================= */
  const business = await Business.findById(businessId).lean();

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  /* ================= FETCH ACCESS ================= */
  const access = await UserBusinessAccess.findOne({
    userId,
    businessId,
    isActive: true,
  }).lean();

  if (!access) {
    throw new Error("ACCESS_DENIED");
  }

  /* ================= SAFE MODULE HANDLING ================= */
  const modules = Array.isArray(business.modules)
    ? business.modules
        .filter((m: any) => m?.enabled === true)
        .map((m: any) => m?.key)
    : [];

  /* ================= RETURN CONTEXT ================= */
  return {
    userId,
    businessId,

    accessKeys: access.accessKeys || [],

    modules,

    config: {
      invoice: business?.documents?.invoices || null,
      creditNotes: business?.documents?.creditNotes || null,
      debitNotes: business?.documents?.debitNotes || null,
      receipts: business?.documents?.receipts || null,

      financial: business?.financial || null,
      compliance: business?.compliance || null,
    },
  };
}
