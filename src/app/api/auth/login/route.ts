import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
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
    const user = await User.findOne({
      $or: [
        ...(email    ? [{ email: email.toLowerCase().trim() }] : []),
        ...(username ? [{ username: username.toLowerCase().trim() }] : []),
      ],
    })
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

    /* ── Build JWT payload ───────────────────────────────────────────── */
    const token = signToken({
      id:             user._id.toString(),
      email:          user.email,
      name:           user.name || user.username || "User",
      role:           user.role || "USER",
      isSuperAdmin:   user.role === "SUPER_ADMIN",
      businessIds:    user.businessIds ?? (user.businessId ? [user.businessId.toString()] : []),
      organizationId: user.organizationId?.toString(),
    });

    const safeUser = {
      id:             user._id.toString(),
      email:          user.email,
      name:           user.name,
      username:       user.username,
      role:           user.role,
      isSuperAdmin:   user.role === "SUPER_ADMIN",
      businessIds:    user.businessIds ?? [],
      organizationId: user.organizationId?.toString(),
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
