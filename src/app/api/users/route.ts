import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { UserService } from "@/services/user/user.service";

/* =========================================================
 * GET USERS (BASIC LIST)
 * =======================================================*/
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const email = searchParams.get("email");

    if (email) {
      const user = await UserService.getUserByEmail(email);

      return NextResponse.json({
        success: true,
        data: user,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Provide email query param to fetch user",
      data: [],
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
 * CREATE USER (FULL IAM FLOW)
 * =======================================================*/
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const {
      name,
      email,
      password,
      organizationId,
      businessId,
      roleCode,
    } = body;

    if (
      !name ||
      !email ||
      !password ||
      !organizationId ||
      !businessId ||
      !roleCode
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await UserService.createUser({
      name,
      email,
      password,
      organizationId,
      businessId,
      roleCode,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
