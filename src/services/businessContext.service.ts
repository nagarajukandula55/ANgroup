import Business from "@/models/Business";
import UserBusinessAccess from "@/models/UserBusinessAccess";

export async function resolveBusinessContext(
  userId: string,
  businessId: string
) {
  const business = await Business.findById(businessId)
    .lean()
    .exec() as any;

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const access = await UserBusinessAccess.findOne({
    userId,
    businessId,
    isActive: true,
  })
    .lean()
    .exec() as any;

  if (!access) {
    throw new Error("ACCESS_DENIED");
  }

  /* ================= SAFE MODULE HANDLING ================= */
  const modules = Array.isArray(business?.modules)
    ? business.modules
        .filter((m: any) => m?.enabled === true)
        .map((m: any) => m?.key)
    : [];

  return {
    userId,
    businessId,

    accessKeys: Array.isArray(access?.accessKeys)
      ? access.accessKeys
      : [],

    modules,

    config: {
      invoice: business?.documents?.invoices,
      documents: business?.documents,
      financial: business?.financial,
      compliance: business?.compliance,
    },
  };
}
