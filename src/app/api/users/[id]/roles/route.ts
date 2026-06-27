import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import UserService from "@/services/user/user.service";

/* =========================================================
 * ASSIGN ROLE TO USER
 * =======================================================*/
export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = context.params.id;
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
