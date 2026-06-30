/**
 * Auth stub — migrated to custom JWT
 * The project no longer uses NextAuth. Auth is handled via:
 *   - src/lib/auth/jwt.ts   (token generation & verification)
 *   - src/middleware.ts      (route protection + header injection)
 *   - /api/auth/login        (credential login)
 *   - /api/auth/logout       (cookie clear)
 *   - /api/auth/me           (current user)
 *
 * These exports are kept as stubs so legacy imports don't break at build time.
 */
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ message: "Auth migrated to custom JWT" });
}
export function POST() {
  return NextResponse.json({ message: "Auth migrated to custom JWT" });
}
export const auth = async () => null;
export const signIn = async () => {};
export const signOut = async () => {};
