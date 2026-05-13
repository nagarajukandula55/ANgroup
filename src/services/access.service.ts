import UserBusinessAccess from "@/models/UserBusinessAccess";
import Business from "@/models/Business";

/* ================= CHECK ACCESS ================= */
export async function hasAccess(
  userId: string,
  businessId: string,
  requiredKey: string
) {
  const access = await UserBusinessAccess.findOne({
    userId,
    businessId,
    isActive: true,
  });

  if (!access) return false;

  return access.accessKeys.includes(requiredKey);
}

/* ================= ASSIGN ACCESS ================= */
export async function assignAccess({
  userId,
  businessId,
  accessKeys,
  designation,
}: any) {
  return UserBusinessAccess.findOneAndUpdate(
    { userId, businessId },
    {
      $set: {
        accessKeys,
        designation,
        isActive: true,
      },
    },
    { upsert: true, new: true }
  );
}

/* ================= GET USER ACCESS ================= */
export async function getUserAccess(
  userId: string,
  businessId: string
) {
  return UserBusinessAccess.findOne({
    userId,
    businessId,
  });
}
