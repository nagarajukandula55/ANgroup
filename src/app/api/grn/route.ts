import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  createGRN,
  getAllGRNs,
} from "@/services/grn.service";
import { generateDocumentNumber } from "@/core/numbering/numberingService";
import { logAction } from "@/lib/audit/logAction";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    if (!body?.businessId) {
      return NextResponse.json(
        { success: false, message: "businessId is required" },
        { status: 400 }
      );
    }

    // grnNumber used to be whatever the client sent (or nothing at all —
    // grn.service.ts's createGRN() treats it as optional pass-through with
    // no generation logic of its own). Generating it server-side here,
    // via the canonical numbering engine, closes both gaps: GRNs always
    // get a real number, and it's not client-controllable/spoofable.
    const { value: grnNumber } = await generateDocumentNumber(body.businessId, "GRN");

    const data = await createGRN({ ...body, grnNumber });

    logAction({
      action: "CREATE",
      entity: "GRN",
      entityId: (data as any)?._id?.toString(),
      after: data,
      req,
      actor: { businessId: body?.businessId?.toString() },
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const data = await getAllGRNs();

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}
