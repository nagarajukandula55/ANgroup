import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Role from "@/models/Role";
import { logAction } from "@/lib/audit/logAction";

// GET /api/admin/roles/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const role = await Role.findById(id);
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/roles/[id] - update permissions
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { permissions, homeRoute, moduleOrder } = body;

    if (permissions !== undefined && !Array.isArray(permissions)) {
      return NextResponse.json({ error: "permissions must be an array" }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (permissions !== undefined) update.permissions = permissions;
    // Per-role post-login landing page and custom sidebar module ordering
    // -- both optional, both just stored as-is (validated by presence in
    // the picker's own options list on the client, same trust level as
    // `permissions` above).
    if (homeRoute !== undefined) update.homeRoute = homeRoute;
    if (moduleOrder !== undefined && Array.isArray(moduleOrder)) update.moduleOrder = moduleOrder;

    const role = await Role.findByIdAndUpdate(
      id,
      update,
      { new: true }
    );
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    logAction({
      action: "UPDATE",
      entity: "Role",
      entityId: id,
      after: update,
      req: request,
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/roles/[id] - delete non-system role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;
    const role = await Role.findById(id);

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    if (role.isSystem === true) {
      return NextResponse.json({ error: "Cannot delete system roles" }, { status: 403 });
    }

    await role.deleteOne();

    logAction({
      action: "DELETE",
      entity: "Role",
      entityId: id,
      req: request,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
