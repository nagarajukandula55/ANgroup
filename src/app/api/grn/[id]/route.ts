import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getGRNById } from "@/services/grn.service";

export async function GET(_: Request, { params }: any) {
  await dbConnect();

  const data = await getGRNById(params.id);

  return NextResponse.json({ success: true, data });
}
