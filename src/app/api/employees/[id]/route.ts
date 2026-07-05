import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import EmployeeProfile from "@/models/EmployeeProfile";
import { logAction } from "@/lib/audit/logAction";

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    await connectDB();

    const employee = await EmployeeProfile.findById(id)
      .populate("userId", "name email phone avatar")
      .lean();

    if (!employee) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    await connectDB();

    const body = await req.json();
    const {
      department,
      designation,
      employmentType,
      joiningDate,
      salary,
      status,
      emergencyContact,
    } = body;

    const update: any = {};
    if (department !== undefined) update.department = department;
    if (designation !== undefined) update.designation = designation;
    if (employmentType !== undefined) update.employmentType = employmentType;
    if (joiningDate !== undefined) update.joiningDate = joiningDate ? new Date(joiningDate) : undefined;
    if (salary !== undefined) update.salary = salary ? Number(salary) : undefined;
    if (status !== undefined) update.status = status;
    if (emergencyContact !== undefined) update.emergencyContact = emergencyContact;

    const employee = await EmployeeProfile.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("userId", "name email phone avatar")
      .lean();

    if (!employee) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

    logAction({
      action: "UPDATE",
      entity: "EmployeeProfile",
      entityId: id,
      after: update,
      req,
    });

    return NextResponse.json({ success: true, employee });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    await connectDB();

    await EmployeeProfile.findByIdAndUpdate(id, { isDeleted: true });

    logAction({
      action: "DELETE",
      entity: "EmployeeProfile",
      entityId: id,
      req,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
