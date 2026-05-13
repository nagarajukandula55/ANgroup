import UserAccess from "@/models/UserAccess";

export async function requireAccess(
  userId: string,
  businessId: string,
  requiredKey: string
) {
  const record = await UserAccess.findOne({
    userId,
    businessId,
  }).lean();

  if (!record) return false;

  return record.accessKeys.includes(requiredKey);
}
