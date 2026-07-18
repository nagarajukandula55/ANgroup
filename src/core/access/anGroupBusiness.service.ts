import Business from "@/models/Business";

/**
 * Returns the real Business document representing AN Group itself (the
 * platform owner), creating it once if it doesn't exist yet. Used wherever
 * code previously meant "platform-wide, no specific business" via a
 * null/sentinel businessId -- AN Group is a real business record so it
 * behaves like any other business everywhere one is expected (business
 * lists, switchers, Admin > Access's per-business category layout), rather
 * than needing every consumer to special-case null.
 */
export async function getOrCreateANGroupBusinessId(): Promise<string> {
  const existing = await Business.findOne({ isPlatform: true }).select("_id").lean();
  if (existing) return String((existing as any)._id);

  const created = await Business.create({
    name: "AN Group",
    brandName: "AN Group",
    businessCode: "ANGROUP",
    tenantKey: "an-group",
    isPlatform: true,
    isActive: true,
  });
  return String(created._id);
}
