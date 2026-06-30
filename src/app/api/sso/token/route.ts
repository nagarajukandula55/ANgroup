/**
 * SSO Token Generation Endpoint
 *
 * Used by: AN Group website, ShopNative, mobile apps, future products
 *
 * Flow:
 *   1. User authenticates on AN Group main portal
 *   2. Client requests SSO token with their session JWT
 *   3. This endpoint returns a short-lived SSO token (1h)
 *   4. Client passes SSO token to other apps
 *   5. Other apps verify at /api/sso/verify
 */

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { signSSOToken, verifyToken, extractToken } from "@/lib/auth/jwt";

export async function POST(req: Request) {
  try {
    // Must have a valid AN Group session token
    const sessionToken = extractToken(req);
    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: "Session token required" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(sessionToken);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: "Invalid session" },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findById(decoded.id).lean().exec() as any;
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "User not found or inactive" },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestedApp = body.app || "unknown";
    const requestedScopes = body.scopes || ["profile", "email"];

    const ssoToken = signSSOToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isSuperAdmin: user.role === "SUPER_ADMIN",
      permissions: requestedScopes,
      issuer: "an-group-erp",
    });

    return NextResponse.json({
      success: true,
      ssoToken,
      expiresIn: 3600, // 1 hour
      tokenType: "Bearer",
      app: requestedApp,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar || null,
      },
      verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/sso/verify`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

// Also allow GET with session cookie (for browser-based SSO)
export async function GET(req: Request) {
  return POST(req);
}
