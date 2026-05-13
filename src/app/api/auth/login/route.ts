import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body?.email || !body?.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email and password required",
        },
        { status: 400 }
      );
    }

    const user = await User.findOne({
      email: body.email,
    })
      .lean()
      .exec() as any;

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user record",
        },
        { status: 500 }
      );
    }

    const valid = await bcrypt.compare(
      body.password,
      user.password
    );

    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid password",
        },
        { status: 401 }
      );
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET missing");
    }

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role || "USER",
        businessId: user.businessId || null,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    const safeUser = {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.businessId,
    };

    return NextResponse.json({
      success: true,
      token,
      user: safeUser,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
