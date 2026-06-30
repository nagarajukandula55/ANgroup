/**
 * Seed Super Admin
 *
 * GET /api/seed  — creates the default super admin (raj / raj) if not exists
 * Protected by a seed secret header in production
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    // Simple protection — require header in production
    if (process.env.NODE_ENV === "production") {
      const seedKey = req.headers.get("x-seed-key");
      if (seedKey !== (process.env.SEED_SECRET || "AN_SEED_2024")) {
        return NextResponse.json(
          { success: false, message: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    await connectDB();

    // Check if super admin already exists
    const existing = await User.findOne({
      $or: [{ username: "raj" }, { email: "raj@angroup.com" }],
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Super admin already exists",
        user: {
          id: existing._id.toString(),
          email: existing.email,
          username: (existing as any).username,
          name: existing.name,
          role: existing.role,
        },
      });
    }

    const hashedPassword = await bcrypt.hash("raj", 12);

    const superAdmin = await User.create({
      name: "Raj (Super Admin)",
      email: "raj@angroup.com",
      username: "raj",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isActive: true,
      isEmailVerified: true,
      authProvider: "credentials",
    } as any);

    return NextResponse.json({
      success: true,
      message: "Super admin created successfully",
      user: {
        id: superAdmin._id.toString(),
        email: superAdmin.email,
        username: (superAdmin as any).username,
        name: superAdmin.name,
        role: superAdmin.role,
      },
      loginWith: {
        username: "raj",
        password: "raj",
        note: "Change password after first login",
      },
    });
  } catch (error: any) {
    console.error("SEED ERROR:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
