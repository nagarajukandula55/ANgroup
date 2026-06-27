import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Main Auth handler for Next.js App Router
 * This is used by route.ts and middleware
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);
