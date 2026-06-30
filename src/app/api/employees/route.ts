import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import EmployeeProfile from "@/models/EmployeeProfile";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const search = searchParams.get("search") || "";
    const department = searchParams.get("department") || "";
    const status = searchParams.get("status") || "";

    if (!businessId) return NextResponse.json({ success: false, error: "businessId required" }, { status: 400 });

    await connectDB();

    const query: any = { businessId, isDeleted: false };
    if (department) query.department = department;
    if (status) query.status = status;

    const employees = await EmployeeProfile.find(query)
      .populate("userId", "name email phone avatar")
      .sort({ createdAt: -1 })
      .lean();

    // Filter by search across populated user fields
    let filtered = employees;
    if (search) {
      const s = search.toLowerCase();
      filtered = employees.filter((e: any) => {
        const user = e.userId as any;
        return (
          user?.name?.toLowerCase().includes(s) ||
          user?.email?.toLowerCase().includes(s) ||
          e.employeeId?.toLowerCase().includes(s) ||
          e.department?.toLowerCase().includes(s) ||
          e.designation?.toLowerCase().includes(s)
        );
      });
    }

    // Stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const total = filtered.length;
    const active = filtered.filter((e: any) => e.status === "ACTIVE").length;
    const onLeave = filtered.filter((e: any) => e.status === "ON_LEAVE").length;
    const newThisMonth = filtered.filter((e: any) => new Date(e.joiningDate) >= startOfMonth).length;

    return NextResponse.json({
      success: true,
      employees: filtered,
      stats: { total, active, onLeave, newThisMonth },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const body = await req.json();
    const {
      businessId,
      employeeUserId,
      employeeId,
      department,
      designation,
      employmentType,
      joiningDate,
      salary,
      status,
      emergencyContact,
    } = body;

    if (!businessId) return NextResponse.json({ success: false, error: "businessId required" }, { status: 400 });
    if (!employeeUserId) return NextResponse.json({ success: false, error: "employeeUserId required" }, { status: 400 });

    // Check for duplicate
    const exists = await EmployeeProfile.findOne({ businessId, userId: employeeUserId, isDeleted: false });
    if (exists) return NextResponse.json({ success: false, error: "Employee profile already exists for this user" }, { status: 409 });

    // Auto-generate employeeId if not provided
    let finalEmployeeId = employeeId;
    if (!finalEmployeeId) {
      const count = await EmployeeProfile.countDocuments({ businessId });
      finalEmployeeId = `EMP${String(count + 1).padStart(4, "0")}`;
    }

    const profile = await EmployeeProfile.create({
      userId: employeeUserId,
      businessId,
      employeeId: finalEmployeeId,
      department,
      designation,
      employmentType: employmentType || "FULL_TIME",
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      salary: salary ? Number(salary) : undefined,
      status: status || "ACTIVE",
      emergencyContact,
    });

    const populated = await profile.populate("userId", "name email phone avatar");

    return NextResponse.json({ success: true, employee: populated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
