import { hasAccess } from "@/services/access.service";

export async function requireAccess(
  userId: string,
  businessId: string,
  key: string
) {
  const allowed = await hasAccess(
    userId,
    businessId,
    key
  );

  if (!allowed) {
    throw new Error("ACCESS_DENIED");
  }

  return true;
}
