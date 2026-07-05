import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import UserService from "@/services/user/user.service";
import { logAction } from "@/lib/audit/logAction";

/* =========================================================
 * ASSIGN ROLE TO USER
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

    const { id: userId } = await context.params;
    const body = await req.json();

    const { roleId, businessMemberId } = body;

    if (!roleId || !businessMemberId) {
      return NextResponse.json(
        { error: "roleId and businessMemberId are required" },
        { status: 400 }
      );
    }

    const result = await UserService.assignRole({
      userId,
      roleId,
      businessMemberId,
      assignedBy: session.user.id,
    });

    logAction({
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      after: { roleId, businessMemberId },
      req,
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
