import { NextRequest, NextResponse } from "next/server";
import { RoleService } from "@/services/role/role.service";
import { auth } from "@/lib/auth/auth";

/* =========================================================
 * GET ROLES
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

    const organizationId = searchParams.get("organizationId");
    const businessId = searchParams.get("businessId") || undefined;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 }
      );
    }

    const roles = await RoleService.getRoles({
      organizationId,
      businessId,
    });

    return NextResponse.json({
      success: true,
      data: roles,
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
 * CREATE ROLE
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
      organizationId,
      businessId,
      name,
      code,
      description,
    } = body;

    if (!organizationId || !name || !code) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const role = await RoleService.createRole({
      organizationId,
      businessId,
      name,
      code,
      description,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: role,
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
