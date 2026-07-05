import { NextResponse } from "next/server";
import { connectDB } from "@/core/db/mongodb";
import Business from "@/models/Business";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { listModulesForBusiness } from "@/core/module-registry/moduleDefinition.service";
import { filterModulesByPermission } from "@/core/access/filterModulesByPermission";

/**
 * MIGRATED from UserBusinessAccess/accessKeys to the Permission-based access
 * system, per the full cutover decision recorded in PROGRESS.md. Access is
 * now: User -> UserRole -> Role -> RolePermission -> Permission (already-
 * built and working via getEnrichedSession(), just not previously connected
 * to the sidebar) crossed against ModuleDefinition (the new module
 * registry) instead of Business.modules[].access + UserBusinessAccess.
 *
 * See scripts/migrateAccessKeysToPermissions.ts for the one-time data
 * migration that converts existing UserBusinessAccess.accessKeys grants
 * into equivalent Role/RolePermission grants, so nobody's current access
 * silently disappears when this route starts checking the new system.
 * That migration MUST be run (once, in production, after this deploys)
 * before this cutover is safe — see PROGRESS.md for status.
 */
export async function POST(req: Request) {
  try {
    await connectDB();

    const { businessId } = await req.json();

    if (!businessId) {
      return NextResponse.json(
        { success: false, message: "businessId is required" },
        { status: 400 }
      );
    }

    const session = await getEnrichedSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const business = await Business.findById(businessId).lean() as any;
    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business not found" },
        { status: 404 }
      );
    }

    const modules = await listModulesForBusiness(businessId);
    const visibleModules = filterModulesByPermission(
      modules,
      session.permissions,
      session.isSuperAdmin
    );

    if (visibleModules.length === 0 && !session.isSuperAdmin) {
      // No visible modules at all — treat the same as the old "access
      // denied" case rather than silently showing an empty sidebar, since
      // that was the original route's behavior for a user with no grants.
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      business: {
        id: business._id,
        name: business.name,
        legalName: business.legalName,
        brandName: business.brandName,
        businessCode: business.businessCode,
      },
      modules: visibleModules,
    });
  } catch (err: any) {
    console.error("SIDEBAR API ERROR:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
