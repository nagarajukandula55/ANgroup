import User from "@/models/User";
import BusinessMember from "@/models/BusinessMember";
import UserRole from "@/models/UserRole";
import Role from "@/models/Role";
import { Types } from "mongoose";

/* =========================================================
 * USER SERVICE
 * =======================================================*/

export class UserService {
  /**
   * Create a new ERP user
   */
  static async createUser(data: {
    name: string;
    email: string;
    password: string;
    organizationId: string;
    businessId: string;
    roleCode: string;
    createdBy?: string;
  }) {
    const existing = await User.findOne({
      email: data.email,
    });

    if (existing) {
      throw new Error("User already exists");
    }

    /**
     * 1. Create user
     */
    const user = await User.create({
      name: data.name,
      email: data.email,
      password: data.password,
      isActive: true,
      isEmailVerified: false,
      role: "CUSTOMER",
    });

    /**
     * 2. Create Business Membership
     */
    const member = await BusinessMember.create({
      organizationId: new Types.ObjectId(data.organizationId),
      businessId: new Types.ObjectId(data.businessId),
      userId: user._id,
      memberType: "EMPLOYEE",
      status: "ACTIVE",
      isDefaultBusiness: true,
      invitedBy: data.createdBy
        ? new Types.ObjectId(data.createdBy)
        : null,
    });

    /**
     * 3. Find Role
     */
    const role = await Role.findOne({
      code: data.roleCode,
      organizationId: data.organizationId,
    });

    if (!role) {
      throw new Error("Role not found");
    }

    /**
     * 4. Assign Role to User
     */
    await UserRole.create({
      userId: user._id,
      roleId: role._id,
      businessMemberId: member._id,
      assignedBy: data.createdBy
        ? new Types.ObjectId(data.createdBy)
        : null,
      isActive: true,
    });

    return {
      user,
      businessMember: member,
      role,
    };
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string) {
    return User.findOne({
      email,
      isDeleted: false,
    });
  }

  /**
   * Get user with full IAM context
   */
  static async getUserContext(userId: string) {
    const user = await User.findById(userId);

    if (!user) return null;

    const memberships = await BusinessMember.find({
      userId: user._id,
    });

    const userRoles = await UserRole.find({
      userId: user._id,
      isActive: true,
    });

    const roleIds = userRoles.map((r) => r.roleId);

    const roles = await Role.find({
      _id: { $in: roleIds },
    });

    return {
      user,
      memberships,
      roles,
    };
  }

  /**
   * Assign role to existing user
   */
  static async assignRole(data: {
    userId: string;
    roleId: string;
    businessMemberId: string;
    assignedBy?: string;
  }) {
    return UserRole.create({
      userId: new Types.ObjectId(data.userId),
      roleId: new Types.ObjectId(data.roleId),
      businessMemberId: new Types.ObjectId(
        data.businessMemberId
      ),
      assignedBy: data.assignedBy
        ? new Types.ObjectId(data.assignedBy)
        : null,
      isActive: true,
    });
  }
}
