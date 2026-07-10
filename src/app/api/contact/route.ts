import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Feedback from "@/models/Feedback";
import { notify } from "@/lib/notify";
import { logAction } from "@/lib/audit/logAction";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Native's contact.ts (lib/an-sdk/contact.ts) never sends a businessId in
// its payload, so this falls back to the Native storefront's Business._id
// (same hardcoded id used in services/order.service.ts's NATIVE_BUSINESS_ID)
// when the caller doesn't supply one explicitly.
const DEFAULT_BUSINESS_ID = "6a4abddcf35feedb2392f556";

/**
 * POST /api/contact — PUBLIC. Body: { name, email?, phone?, message, businessId? }.
 * Persists the submission to Feedback so it surfaces in
 * /admin/feedback instead of disappearing into a console.log.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim();
    const message = String(body?.message || "").trim();
    const businessId =
      body?.businessId && mongoose.Types.ObjectId.isValid(body.businessId)
        ? body.businessId
        : DEFAULT_BUSINESS_ID;

    if (!name) {
      return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ success: false, message: "Message is required" }, { status: 400 });
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ success: false, message: "Invalid email" }, { status: 400 });
    }

    const feedback = await Feedback.create({
      businessId: new mongoose.Types.ObjectId(businessId),
      name,
      email,
      phone,
      message,
      status: "NEW",
      source: "contact-form",
    });

    // Best-effort — submission already succeeded above regardless.
    notify({
      event: "STAFF_ALERT",
      businessId: String(businessId),
      message: `📩 New contact form submission from ${name}${email ? ` (${email})` : ""}\n${message}`,
    }).catch(() => {});

    logAction({
      action: "CREATE",
      entity: "Feedback",
      entityId: feedback._id?.toString(),
      after: feedback,
      req,
      actor: { id: "public", businessId: String(businessId) },
    });

    return NextResponse.json(
      { success: true, message: "Thank you for your feedback", id: String(feedback._id) },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Contact form POST error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
