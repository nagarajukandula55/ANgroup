import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { comparePassword } from "./password";
import User from "@/models/User";

/**
 * Core Auth.js v5 configuration
 * This is shared between route handler + middleware
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Credentials",

      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await User.findOne({
          email: credentials.email,
          isDeleted: false,
        }).select("+password");

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (!user.isActive) {
          throw new Error("User is inactive");
        }

        const isPasswordValid = await comparePassword(
          credentials.password as string,
          user.password as string
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    /**
     * JWT callback - runs when token is created/updated
     */
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }

      return token;
    },

    /**
     * Session callback - enrich session object
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
      }

      return session;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};
