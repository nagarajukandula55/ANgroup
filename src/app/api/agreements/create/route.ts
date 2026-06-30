import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Agreement from "@/models/Agreement";

async function getNextNumber(): Promise<string> {
  const last = await Agreement.findOne({}, {}, { sort: { createdAt: -1 } }).lean() as any;
  const lastNum = last?.agreementNumber ? parseInt(last.agreementNumber.split('-')[1] || '0') : 0;
  return `AGR-${String(lastNum + 1).padStart(4, '0')}`;
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ success: false, message: "Auth required" }, { status: 401 });

    const body = await req.json();
    const number = await getNextNumber();

    const agreement = await Agreement.create({
      ...body,
      agreementNumber: number,
      createdBy: userId,
      status: "DRAFT",
    });

    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
