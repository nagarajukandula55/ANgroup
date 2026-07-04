import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import VendorProfile from "@/models/VendorProfile";
import Business from "@/models/Business";
import Agreement from "@/models/Agreement";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/vendors/[id]/review
 * Body: { action: "APPROVE" | "REJECT", reason?: string }
 *
 * Step 2 of vendor onboarding: admin reviews the application.
 *  - APPROVE → a VENDOR partner agreement is generated (parties: business +
 *    vendor) and the vendor moves to AGREEMENT_SENT. The admin then sends it
 *    for OTP signing from the Agreements screen (existing flow).
 *  - REJECT  → status REJECTED with a reason.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const action = body.action as "APPROVE" | "REJECT";

    const vendor = await VendorProfile.findById(id);
    if (!vendor || vendor.isDeleted) {
      return NextResponse.json({ success: false, error: "Vendor not found" }, { status: 404 });
    }

    if (action === "REJECT") {
      vendor.status = "REJECTED";
      vendor.rejectionReason = body.reason || "Not specified";
      vendor.reviewedBy = userId as any;
      vendor.reviewedAt = new Date();
      await vendor.save();
      return NextResponse.json({ success: true, vendor });
    }

    if (action !== "APPROVE") {
      return NextResponse.json(
        { success: false, error: "action must be APPROVE or REJECT" },
        { status: 400 }
      );
    }

    if (!["APPLIED", "PENDING"].includes(vendor.status)) {
      return NextResponse.json(
        { success: false, error: `Vendor is already ${vendor.status} — review applies to new applications only` },
        { status: 400 }
      );
    }

    const business = await (Business as any)
      .findById(vendor.businessId)
      .select("name legalName brandName address city state pincode compliance email")
      .lean();

    const businessDisplay = business?.legalName || business?.name || "The Business";
    const vendorDisplay = vendor.companyName;

    /* ── Generate the partner agreement ────────────────────────────── */
    const content = `VENDOR PARTNER AGREEMENT

This Vendor Partner Agreement ("Agreement") is entered into between:

1. ${businessDisplay}${business?.compliance?.gstNumber ? ` (GSTIN: ${business.compliance.gstNumber})` : ""}, having its registered office at ${[business?.address, business?.city, business?.state, business?.pincode].filter(Boolean).join(", ") || "its registered address"} ("the Company"), and

2. ${vendorDisplay}${vendor.gstRegistered && vendor.gstNumber ? ` (GSTIN: ${vendor.gstNumber})` : vendor.panNumber ? ` (PAN: ${vendor.panNumber})` : ""}, having its registered office at ${[vendor.address?.street, vendor.address?.city, vendor.address?.state, vendor.address?.pincode].filter(Boolean).join(", ") || "its registered address"} ("the Vendor").

1. SCOPE — The Vendor shall supply products/services to the Company and may list approved products on the Company's sales channels. All product listings are subject to the Company's review and approval.

2. ORDERS & FULFILMENT — Orders received on the Company's channels will be shared with the Vendor for confirmation. On confirmation, a purchase (B2B) transaction is raised from the Vendor to the Company, and the Company invoices the end customer directly.

3. INVOICING & TAX — ${vendor.gstRegistered ? "The Vendor is GST-registered and shall raise valid GST-compliant B2B invoices to the Company for all confirmed orders." : "The Vendor is not GST-registered; commercial terms shall account for applicable tax treatment under the Company's policies."}

4. PAYMENTS — The Company shall settle Vendor invoices per the agreed payment terms (${vendor.paymentTerms || "30 days"}).

5. QUALITY & COMPLIANCE — The Vendor warrants that all supplied products meet applicable quality, safety and labelling standards.

6. TERM & TERMINATION — Either party may terminate with 30 days' written notice. Confirmed orders survive termination.

7. GOVERNING LAW — This Agreement is governed by the laws of India.

By signing below, both parties agree to the terms above.`;

    const agreement = await (Agreement as any).create({
      businessId: vendor.businessId,
      createdBy: userId,
      title: `Vendor Partner Agreement — ${vendorDisplay}`,
      type: "VENDOR",
      content,
      parties: [
        {
          name: businessDisplay,
          email: business?.email || undefined,
          role: "Company",
        },
        {
          name: vendor.contactPerson || vendorDisplay,
          email: vendor.email,
          role: "Vendor",
        },
      ],
      signatures: [],
      status: "DRAFT",
    });

    vendor.status = "AGREEMENT_SENT";
    vendor.agreementId = agreement._id;
    vendor.reviewedBy = userId as any;
    vendor.reviewedAt = new Date();
    await vendor.save();

    return NextResponse.json({
      success: true,
      vendor,
      agreementId: agreement._id,
      next:
        "Agreement generated. Open it in Agreements and hit Send to deliver the OTP signing link to the vendor.",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
