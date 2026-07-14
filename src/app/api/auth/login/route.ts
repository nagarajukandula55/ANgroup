import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import BusinessMember from "@/models/BusinessMember";
import UserRole from "@/models/UserRole";
import Role from "@/models/Role";
import { signToken } from "@/lib/auth/jwt";

// Anyone holding ONLY these floor roles has no admin-panel business at
// all -- they should never see the /admin shell, just their own storefront
// account (shopnative.in for now; angroup.in has no customer-facing UI of
// its own yet, so it also lands there).
const MINIMAL_FLOOR_ROLE_CODES = ["CUSTOMER_SHOPNATIVE", "CUSTOMER_ANGROUP"];

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const { email, username, password } = body ?? {};

    if ((!email && !username) || !password) {
      return NextResponse.json(
        { success: false, message: "Credentials required" },
        { status: 400 }
      );
    }

    /* ── Find user by email OR username ──────────────────────────────── */
    // password has select:false — must explicitly request it
    const user = await User.findOne({
      $or: [
        ...(email    ? [{ email: email.toLowerCase().trim() }] : []),
        ...(username ? [{ username: username.toLowerCase().trim() }] : []),
      ],
    })
      .select("+password")
      .lean()
      .exec() as any;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { success: false, message: "Invalid user record" },
        { status: 500 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Invalid password" },
        { status: 401 }
      );
    }

    /* ── Load business memberships from BusinessMember collection ────── */
    const memberships = await BusinessMember.find({
      userId: user._id,
      status: "ACTIVE",
    })
      .select("businessId isDefaultBusiness memberType")
      .lean()
      .exec() as any[];

    const businessIds: string[] = memberships.map((m) => m.businessId.toString());

    // Pick active business: prefer isDefaultBusiness, then legacy defaultBusinessId, then first
    let activeBusinessId: string | undefined;
    const defaultMembership = memberships.find((m) => m.isDefaultBusiness);
    if (defaultMembership) {
      activeBusinessId = defaultMembership.businessId.toString();
    } else if (user.defaultBusinessId) {
      activeBusinessId = user.defaultBusinessId.toString();
    } else if (businessIds.length > 0) {
      activeBusinessId = businessIds[0];
    }

    // Super admin gets all business access — no restriction
    const isSuperAdmin = user.role === "SUPER_ADMIN";

    // A user whose ONLY roles are the minimal self-registration floor (no
    // AN staff role, no vendor-team role, no business membership) gets
    // redirected to shopnative.in rather than the admin panel -- there's no
    // separate customer UI in this repo yet.
    const userRoleDocs = await UserRole.find({ userId: user._id }).lean().exec() as any[];
    const grantedRoles = userRoleDocs.length
      ? await Role.find({ _id: { $in: userRoleDocs.map((r) => r.roleId) } }).select("code homeRoute").lean().exec() as any[]
      : [];
    const roleCodes = grantedRoles.map((r) => r.code);
    // Per-role configurable login landing page (admin/roles editor's new
    // "Home Page" field) -- a floor role (CUSTOMER etc.) never has one set,
    // so the first non-floor role that does wins. Falls back to the
    // existing role/account-type redirect the login page already does when
    // nothing is configured, so this is additive, not a behavior change for
    // roles nobody has configured a home page for yet.
    const homeRoute = grantedRoles.find((r) => r.homeRoute && !MINIMAL_FLOOR_ROLE_CODES.includes(r.code))?.homeRoute || null;
    const isMinimalOnly =
      roleCodes.length > 0 &&
      roleCodes.every((c: string) => MINIMAL_FLOOR_ROLE_CODES.includes(c)) &&
      memberships.length === 0 &&
      !isSuperAdmin;

    /* ── Build JWT payload ───────────────────────────────────────────── */
    const token = signToken({
      id:               user._id.toString(),
      email:            user.email,
      name:             user.name || user.username || "User",
      role:             user.role || "USER",
      isSuperAdmin,
      businessIds,
      activeBusinessId,
      organizationId:   user.organizationId?.toString(),
      mustChangePassword: !!user.mustChangePassword,
    });

    const safeUser = {
      id:               user._id.toString(),
      email:            user.email,
      name:             user.name,
      username:         user.username,
      role:             user.role,
      isSuperAdmin,
      businessIds,
      activeBusinessId,
      organizationId:   user.organizationId?.toString(),
      mustChangePassword: !!user.mustChangePassword,
      isMinimalOnly,
      homeRoute,
    };

    /* ── Set httpOnly cookie + return token in JSON ──────────────────── */
    const res = NextResponse.json({ success: true, token, user: safeUser });

    res.cookies.set("an_token", token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge:   60 * 60 * 24 * 7, // 7 days
      path:     "/",
    });

    return res;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
