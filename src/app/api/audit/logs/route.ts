import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import AuditLog from "@/models/AuditLog";

/* =========================================================
 * GET AUDIT LOGS
 * =======================================================*/
export async function GET(req: NextRequest) {
  try {
    const session = await getEnrichedSession();

    if (!session?.user || !session.business) {
      return NextResponse.json(
        { error: "Unauthorized or missing business context" },
        { status: 401 }
      );
    }

    requirePermission(session as any, "audit.view");

    const { searchParams } = new URL(req.url);

    const userId = searchParams.get("userId");
    const entity = searchParams.get("entity");
    const entityId = searchParams.get("entityId");

    const businessId = new Types.ObjectId(
      session.business.businessId
    );

    const query: any = { businessId };

    if (userId) query.userId = new Types.ObjectId(userId);
    if (entity) query.entity = entity;
    if (entityId) query.entityId = entityId;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(200);

    return NextResponse.json({
      success: true,
      data: logs,
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
 * CREATE AUDIT LOG (SYSTEM + MANUAL EVENTS)
 * =======================================================*/
export async function POST(req: NextRequest) {
  try {
    const session = await getEnrichedSession();

    if (!session?.user || !session.business) {
      return NextResponse.json(
        { error: "Unauthorized or missing business context" },
        { status: 401 }
      );
    }

    requirePermission(session as any, "audit.create");

    const body = await req.json();

    const {
      action,
      entity,
      entityId,
      before,
      after,
      metadata,
    } = body;

    if (!action || !entity) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const log = await AuditLog.create({
      businessId: new Types.ObjectId(session.business.businessId),
      userId: new Types.ObjectId(session.user.id),
      action,
      entity,
      entityId: entityId
        ? new Types.ObjectId(entityId)
        : null,
      before,
      after,
      metadata,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: log,
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
