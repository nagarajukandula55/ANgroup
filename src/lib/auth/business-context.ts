import { auth } from "./auth";
import User from "@/models/User";
import BusinessMember from "@/models/BusinessMember";
import { Types } from "mongoose";

/**
 * =========================================================
 * BUSINESS CONTEXT (MULTI-TENANT CORE)
 * =========================================================
 * Resolves active business context for current user session
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
  const session = await auth();

  if (!session?.user?.email) return null;

  const user = await User.findOne({
    email: session.user.email,
  });

  if (!user) return null;

  /**
   * Get active business membership
   */
  const membership = await BusinessMember.findOne({
    userId: user._id,
    isDeleted: false,
    status: "ACTIVE",
    isDefaultBusiness: true,
  });

  if (!membership) return null;

  return {
    userId: user._id.toString(),
    businessId: membership.businessId.toString(),
    organizationId: membership.organizationId.toString(),
    membershipId: membership._id.toString(),
  };
}

/**
 * Get all businesses for current user
 */
export async function getUserBusinesses() {
  const session = await auth();

  if (!session?.user?.email) return [];

  const user = await User.findOne({
    email: session.user.email,
  });

  if (!user) return [];

  return BusinessMember.find({
    userId: user._id,
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
