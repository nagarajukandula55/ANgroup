import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import BusinessMember from "@/models/BusinessMember";
import { signToken } from "@/lib/auth/jwt";

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

    // Several signup paths deliberately create the account with
    // isActive:false — a vendor pending admin approval
    // (register/vendor/route.ts), or an employee pending HR activation —
    // but this check never existed, so a valid password alone was enough
    // to log in and receive a full session token regardless of pending
    // status. Must be checked here, not just left to "isActive" filters on
    // individual downstream routes, since the token itself grants access.
    if (user.isActive === false) {
      return NextResponse.json(
        { success: false, message: "Your account is not active yet. Please wait for approval or contact support." },
        { status: 403 }
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
