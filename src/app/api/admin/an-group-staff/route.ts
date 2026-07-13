import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Role from "@/models/Role";
import UserRole from "@/models/UserRole";
import { seedAnGroupStaffRoles, AN_GROUP_ROLE_DEFS } from "@/core/access/anGroupStaffRoles.service";
import { logAction } from "@/lib/audit/logAction";

/**
 * AN Group platform-staff roles (Business Admin, Product Admin, Sales
 * Admin, Material Admin, Finance Admin, SCM Admin) -- see
 * core/access/anGroupStaffRoles.service.ts for the role/permission
 * definitions. Super-admin only.
 *
 * GET  — seeds/refreshes the 6 roles (idempotent) and returns them, plus
 *        every user currently holding one.
 * POST — either creates a brand-new login for one of these roles, or
 *        attaches the role to an existing user (by username), per `mode`.
 */

async function requireSuperAdmin() {
  const h = await headers();
  const userId = h.get("x-user-id");
  const isSuperAdmin = h.get("x-is-super-admin") === "true";
  return { userId, ok: !!userId && isSuperAdmin };
}

export async function GET() {
  try {
    await connectDB();
    const { ok } = await requireSuperAdmin();
    if (!ok) return NextResponse.json({ success: false, error: "Super Admin access required" }, { status: 403 });

    const roles = await seedAnGroupStaffRoles();

    const grants = await UserRole.find({ roleId: { $in: roles.map((r) => r.roleId) } })
      .populate("userId", "name email username")
      .lean();

    const holders = roles.map((r) => ({
      ...r,
      users: grants
        .filter((g: any) => String(g.roleId) === r.roleId)
        .map((g: any) => g.userId)
        .filter(Boolean),
    }));

    return NextResponse.json({ success: true, roles: holders });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { userId: callerId, ok } = await requireSuperAdmin();
    if (!ok) return NextResponse.json({ success: false, error: "Super Admin access required" }, { status: 403 });

    const body = await req.json();
    const { mode, roleCode } = body;

    const roleDef = AN_GROUP_ROLE_DEFS.find((r) => r.code === roleCode);
    if (!roleDef) {
      return NextResponse.json({ success: false, error: "Unknown AN Group staff role" }, { status: 400 });
    }
    await seedAnGroupStaffRoles();
    const roleDoc = await Role.findOne({ code: roleCode, businessId: null, vendorId: null });
    if (!roleDoc) {
      return NextResponse.json({ success: false, error: "Role seed failed unexpectedly" }, { status: 500 });
    }

    if (mode === "assign") {
      const { username } = body;
      if (!username) {
        return NextResponse.json({ success: false, error: "username is required" }, { status: 400 });
      }
      const targetUser = await User.findOne({
        username: String(username).toLowerCase().trim(),
        isDeleted: { $ne: true },
      });
      if (!targetUser) {
        return NextResponse.json({ success: false, error: "No user found with that ID" }, { status: 404 });
      }
      await UserRole.findOneAndUpdate(
        { userId: targetUser._id, roleId: roleDoc._id },
        { $setOnInsert: { userId: targetUser._id, roleId: roleDoc._id, assignedBy: callerId } },
        { upsert: true }
      );
      logAction({ action: "UPDATE", entity: "UserRole", entityId: String(targetUser._id), after: { roleCode }, req });
      return NextResponse.json({ success: true, user: { _id: targetUser._id, name: targetUser.name, username: targetUser.username } });
    }

    if (mode === "create") {
      const { name, username, password } = body;
      if (!name || !username) {
        return NextResponse.json({ success: false, error: "name and username are required" }, { status: 400 });
      }
      const uname = String(username).toLowerCase().trim();
      const existing = await User.findOne({ username: uname, isDeleted: { $ne: true } });
      if (existing) {
        return NextResponse.json({ success: false, error: "This user ID is already taken" }, { status: 409 });
      }
      // "id and password as same" per the request -- still forced through
      // mustChangePassword below so it's a one-time bootstrap credential,
      // not a standing weak password.
      const rawPassword = password || uname;
      const hashedPassword = await bcrypt.hash(rawPassword, 12);
      const user = await User.create({
        name,
        email: `${uname}@angroup.staff`,
        username: uname,
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
        isEmailVerified: false,
        authProvider: "credentials",
        isDeleted: false,
        mustChangePassword: true,
      });
      await UserRole.create({ userId: user._id, roleId: roleDoc._id, assignedBy: callerId });
      logAction({ action: "CREATE", entity: "User", entityId: String(user._id), after: { roleCode }, req });
      return NextResponse.json({
        success: true,
        user: { _id: user._id, name: user.name, username: user.username },
        credentials: { username: uname, password: rawPassword },
      });
    }

    return NextResponse.json({ success: false, error: "mode must be 'create' or 'assign'" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
