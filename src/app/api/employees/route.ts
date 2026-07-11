import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import EmployeeProfile from "@/models/EmployeeProfile";
import { generateGlobalDocumentNumber } from "@/core/numbering/numberingService";
import { logAction } from "@/lib/audit/logAction";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";

function permissionErrorResponse(err: any) {
  return NextResponse.json(
    { success: false, error: err.message },
    { status: err.code === "FORBIDDEN" ? 403 : 401 }
  );
}

export async function GET(request: NextRequest) {
  try {
    // Was entirely ungated -- any authenticated user of any role (including
    // CUSTOMER) could list any business's employee records, salaries
    // included, just by passing a businessId. Same requirePermission
    // pattern every other admin-data route in this codebase already uses.
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("employees", "view"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }
    const headersList = await headers();
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);

    const businessId =
      headersList.get("x-active-business-id") ||
      searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "businessId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const filter: Record<string, unknown> = {
      businessId: new mongoose.Types.ObjectId(businessId),
      isDeleted: false,
    };

    const search = searchParams.get("search");
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { department: searchRegex },
        { designation: searchRegex },
      ];
    }

    const department = searchParams.get("department");
    if (department && department.trim()) {
      filter.department = department.trim();
    }

    const status = searchParams.get("status");
    if (status && status.trim()) {
      filter.status = status.trim();
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limitRaw = parseInt(searchParams.get("limit") || "50", 10);
    const limit = Math.min(100, Math.max(1, limitRaw));
    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      EmployeeProfile.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      EmployeeProfile.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      employees,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error("GET /api/employees error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("employees", "create"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }
    const userId = session.user.id;

    const body = await request.json();

    const {
      name,
      email,
      phone,
      department,
      designation,
      employmentType,
      joiningDate,
      salary,
      businessId,
      userId: linkedUserId,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Employee name is required" },
        { status: 400 }
      );
    }

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "businessId is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // employeeId has a GLOBAL unique index (see models/EmployeeProfile.ts),
    // no businessId in the index -- uses the canonical numbering engine's
    // global-scope variant so employee IDs share one atomic counter across
    // every business, same as vendor IDs.
    const { value: employeeId } = await generateGlobalDocumentNumber("EMPLOYEE", businessId);

    // Links to the actual employee's own account when the caller picked one
    // from the user-search autocomplete -- previously discarded (only used
    // to prefill name/email/phone), so an employee created here could never
    // be found by their own login. Falls back to no link (a pure HR record)
    // when nobody was picked.
    const employee = await EmployeeProfile.create({
      userId: linkedUserId && mongoose.Types.ObjectId.isValid(linkedUserId)
        ? new mongoose.Types.ObjectId(linkedUserId)
        : undefined,
      businessId: new mongoose.Types.ObjectId(businessId),
      employeeId,
      name: name.trim(),
      email: email?.trim() || undefined,
      phone: phone?.trim() || undefined,
      department: department?.trim() || undefined,
      designation: designation?.trim() || undefined,
      employmentType: employmentType || "FULL_TIME",
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      salary: typeof salary === "number" ? salary : 0,
    });

    logAction({
      action: "CREATE",
      entity: "EmployeeProfile",
      entityId: employee._id?.toString(),
      after: employee,
      req: request,
      actor: { id: userId, businessId },
    });

    return NextResponse.json(
      { success: true, employee },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/employees error:", error);

    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    // Duplicate employeeId (race condition) or duplicate {businessId,userId}
    // (that user already has an employee record in this business).
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: "This employee already exists (duplicate ID or already-linked user)" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
