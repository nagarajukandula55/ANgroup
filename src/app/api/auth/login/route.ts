import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { signToken } from "@/lib/auth/jwt";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const identifier = body?.email || body?.username;

    if (!identifier || !body?.password) {
      return NextResponse.json(
        { success: false, message: "Username/email and password required" },
        { status: 400 }
      );
    }

    // Support login by email OR username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
      ],
      isDeleted: false,
    })
      .select("+password")
      .lean()
      .exec() as any;

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, message: "Account is inactive. Contact administrator." },
        { status: 403 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        { success: false, message: "Password not set for this account" },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(body.password, user.password);

    if (!valid) {
      // Increment failed attempts
      await User.findByIdAndUpdate(user._id, {
        $inc: { failedLoginAttempts: 1 },
      });
      return NextResponse.json(
        { success: false, message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Reset failed attempts and update lastLogin
    await User.findByIdAndUpdate(user._id, {
      failedLoginAttempts: 0,
      lastLogin: new Date(),
    });

    const token = signToken({
      id: user._id.toString(),
      email: user.email,
      username: user.username || undefined,
      name: user.name,
      role: user.role || "CUSTOMER",
      isSuperAdmin: user.role === "SUPER_ADMIN",
      businessIds: (user.businessAccess || []).map((b: any) => b.businessId),
      organizationId: user.defaultOrganizationId?.toString() || undefined,
    });

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username || null,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.role === "SUPER_ADMIN",
        avatar: user.avatar || null,
      },
    });

    // Set httpOnly cookie for web sessions (7 days)
    response.cookies.set("an_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
