import { headers } from "next/headers";
import User from "@/models/User";
import BusinessMember from "@/models/BusinessMember";
import { Types } from "mongoose";

/**
 * =========================================================
 * BUSINESS CONTEXT (MULTI-TENANT CORE)
 * =========================================================
 * Reads user identity from JWT middleware headers, then resolves
 * the active business membership from MongoDB.
 *
 * The custom JWT middleware (src/middleware.ts) injects:
 *   x-user-id, x-user-email, x-user-name, x-user-role, x-is-super-admin
 * =========================================================
 */

export interface IBusinessContext {
  userId: string;
  businessId: string;
  organizationId: string;
  membershipId: string;
}

/**
 * Get current active business context
 */
export async function getBusinessContext(): Promise<IBusinessContext | null> {
  const headersList = await headers();
  const userEmail = headersList.get("x-user-email");

  if (!userEmail) return null;

  const user = await User.findOne({ email: userEmail }).lean();

  if (!user) return null;

  const membership = await BusinessMember.findOne({
    userId: (user as any)._id,
    isDeleted: false,
    status: "ACTIVE",
    isDefaultBusiness: true,
  }).lean();

  if (!membership) return null;

  return {
    userId: (user as any)._id.toString(),
    businessId: (membership as any).businessId.toString(),
    organizationId: (membership as any).organizationId.toString(),
    membershipId: (membership as any)._id.toString(),
  };
}

/**
 * Get all businesses for current user
 */
export async function getUserBusinesses() {
  const headersList = await headers();
  const userEmail = headersList.get("x-user-email");

  if (!userEmail) return [];

  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) return [];

  return BusinessMember.find({
    userId: (user as any)._id,
    isDeleted: false,
  }).populate("businessId");
}

/**
 * Switch active business for user
 */
export async function switchBusiness(
  userId: string,
  businessId: string
) {
  await BusinessMember.updateMany(
    { userId: new Types.ObjectId(userId) },
    { isDefaultBusiness: false }
  );

  await BusinessMember.updateOne(
    {
      userId: new Types.ObjectId(userId),
      businessId: new Types.ObjectId(businessId),
    },
    {
      isDefaultBusiness: true,
    }
  );

  return {
    success: true,
    activeBusinessId: businessId,
  };
}
