import UserBusinessAccess from "@/models/UserBusinessAccess";

/**
 * Check if user has a required access key
 */
export async function requireAccess(
  userId: string,
  businessId: string,
  requiredKey: string
): Promise<boolean> {
  const record = await UserBusinessAccess.findOne({
    userId,
    businessId,
    isActive: true,
  })
    .lean()
    .exec() as any;

  if (!record || !Array.isArray(record.accessKeys)) {
    return false;
  }

  return record.accessKeys.includes(requiredKey);
}
