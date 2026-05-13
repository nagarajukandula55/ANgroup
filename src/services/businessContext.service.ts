import Business from "@/models/Business";
import UserBusinessAccess from "@/models/UserBusinessAccess";

/* ================= RESOLVE CONTEXT ================= */
export async function resolveBusinessContext(
  userId: string,
  businessId: string
) {
  const business = await Business.findById(
    businessCode
  ).lean();

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const access = await UserBusinessAccess.findOne({
    userId,
    businessId,
    isActive: true,
  }).lean();

  if (!access) {
    throw new Error("ACCESS_DENIED");
  }

  return {
    userId,
    businessId,

    accessKeys: access.accessKeys || [],

    modules:
      business.modules
        ?.filter((m: any) => m.enabled)
        .map((m: any) => m.key) || [],

    config: {
      invoice: business.documents?.invoices,
      documents: business.documents,
      financial: business.financial,
      compliance: business.compliance,
    },
  };
}
