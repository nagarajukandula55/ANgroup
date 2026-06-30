import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import RolePermission from "@/models/RolePermission";
import { Types } from "mongoose";

/* =========================================================
 * ASSIGN PERMISSIONS TO ROLE (REPLACE MODE)
 * =======================================================*/
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: roleId } = await context.params;
    const body = await req.json();

    const { permissionIds } = body as {
      permissionIds: string[];
    };

    if (!Array.isArray(permissionIds)) {
      return NextResponse.json(
        { error: "permissionIds must be an array" },
        { status: 400 }
      );
    }

    const roleObjectId = new Types.ObjectId(roleId);

    /**
     * STEP 1: Remove existing permissions for role
     */
    await RolePermission.deleteMany({
      roleId: roleObjectId,
    });

    /**
     * STEP 2: Insert new permissions (bulk)
     */
    const operations = permissionIds.map((pid) => ({
      insertOne: {
        document: {
          roleId: roleObjectId,
          permissionId: new Types.ObjectId(pid),
          createdBy: session.user.id
            ? new Types.ObjectId(session.user.id)
            : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    }));

    if (operations.length > 0) {
      await RolePermission.bulkWrite(operations);
    }

    return NextResponse.json({
      success: true,
      message: "Role permissions updated successfully",
      assignedCount: permissionIds.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
 * GET ROLE PERMISSIONS (FOR UI PRELOAD)
 * =======================================================*/
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: roleId } = await context.params;

    const mappings = await RolePermission.find({
      roleId: new Types.ObjectId(roleId),
    });

    return NextResponse.json({
      success: true,
      data: mappings.map((m) =>
        m.permissionId.toString()
      ),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
