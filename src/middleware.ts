import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth";

/**
 * ERP Route Protection Middleware
 */
export async function middleware(req: NextRequest) {
  const session = await auth();

  const { pathname } = req.nextUrl;

  /**
   * Public routes (no auth required)
   */
  const publicRoutes = [
    "/login",
    "/register",
    "/api/auth",
    "/_next",
    "/favicon.ico",
  ];

  const isPublic = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isPublic) {
    return NextResponse.next();
  }

  /**
   * Require authentication for protected routes
   */
  if (!session?.user) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  /**
   * Future: role-based route protection hook
   * (we will plug permission engine here later)
   */

  return NextResponse.next();
}

/**
 * Apply middleware only to important routes
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
