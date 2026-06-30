import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Agreement from "@/models/Agreement";

export async function POST(req: Request) {
  try {
    await connectDB();
    const userId = req.headers.get("x-user-id");
    const body = await req.json();
    const { agreementId, party, signature } = body; // party: 'company' | 'vendor'

    if (!agreementId || !party || !signature) {
      return NextResponse.json({ success: false, message: "agreementId, party, and signature required" }, { status: 400 });
    }

    const agreement = await Agreement.findById(agreementId);
    if (!agreement) return NextResponse.json({ success: false, message: "Agreement not found" }, { status: 404 });

    if (party === 'company') {
      agreement.companySignature = signature;
      agreement.companySignedAt = new Date();
      if (agreement.vendorSignature) agreement.status = "SIGNED" as any;
      else agreement.status = "PENDING_VENDOR" as any;
    } else if (party === 'vendor') {
      agreement.vendorSignature = signature;
      agreement.vendorSignedAt = new Date();
      if (agreement.companySignature) agreement.status = "SIGNED" as any;
      else agreement.status = "PENDING_COMPANY" as any;
    } else {
      return NextResponse.json({ success: false, message: "Invalid party" }, { status: 400 });
    }

    await agreement.save();
    return NextResponse.json({ success: true, agreement });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
