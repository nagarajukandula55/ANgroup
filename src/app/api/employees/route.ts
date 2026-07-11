import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Employee from "@/models/Employee";
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
      Employee.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Employee.countDocuments(filter),
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

    // employeeId has a GLOBAL unique index (see models/Employee.ts —
    // `{ employeeId: 1 }, { unique: true, sparse: true }`, no businessId
    // in the index), but this used to count PER-BUSINESS — the same class
    // of bug the vendor-ID generators had (two businesses' first employee
    // would both compute EMP-0001 and the second create would crash on
    // the unique-index violation). Now uses the canonical numbering
    // engine's global-scope variant so employee IDs share one atomic
    // counter across every business, same as vendor IDs.
    const { value: employeeId } = await generateGlobalDocumentNumber("EMPLOYEE", businessId);

    const employee = await Employee.create({
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
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
      entity: "Employee",
      entityId: employee._id?.toString(),
      after: employee,
      req: request,
      actor: { businessId },
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

    // Handle duplicate employeeId race condition
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: "Employee ID conflict, please retry" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
