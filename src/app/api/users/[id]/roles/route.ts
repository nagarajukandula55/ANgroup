import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import UserService from "@/services/user/user.service";
import { logAction } from "@/lib/audit/logAction";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";

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

    // auth() confirms a real session but has no RBAC concept of its own --
    // was missing a permission gate entirely, so any authenticated user
    // (any role) could assign roles to any other user. "edit" is one of
    // the fixed STANDARD_ACTIONS (see core/access/actions.ts), already
    // seeded for the "users" module -- reused rather than inventing a new
    // action key that would never resolve to a real Permission row.
    const enrichedSession = await getEnrichedSession();
    try {
      requirePermission(enrichedSession as any, buildPermissionCode("users", "edit"));
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message },
        { status: err.code === "FORBIDDEN" ? 403 : 401 }
      );
    }

    const { id: userId } = await context.params;
    const body = await req.json();

    // businessId is optional -- UserRole's real schema (models/UserRole.ts)
    // only has userId/roleId/businessId/assignedBy, no "businessMemberId"
    // at all. This route used to hard-require a "businessMemberId" that
    // doesn't exist anywhere in the schema and that the admin/users/[id]
    // page's simple "Assign Role" dropdown never sent -- every assignment
    // from that screen 400'd before ever reaching UserService.assignRole,
    // which is why assigning a role (including a pre-existing "system"
    // role) silently never applied.
    const { roleId, businessId } = body;

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 }
      );
    }

    const result = await UserService.assignRole({
      userId,
      roleId,
      businessId,
      assignedBy: session.user.id,
    });

    logAction({
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      after: { roleId, businessId },
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
