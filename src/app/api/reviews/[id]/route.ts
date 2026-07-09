import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Review from "@/models/Review";

/**
 * PATCH /api/reviews/[id] — moderation. NOT in middleware's PUBLIC_PREFIXES,
 * so this requires a valid an_token session (x-user-id injected by
 * middleware) — a business admin approving/rejecting a pending review.
 *
 * Originally only checked that x-user-id was present — meaning ANY
 * authenticated caller, including the review's own author, could approve
 * their own review. Now requires an admin-level role, matching the same
 * direct role-check pattern used by api/users/route.ts.
 *
 * Body: { status: "APPROVED" | "REJECTED" }
 */
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = req.headers.get("x-user-id");
    const role = req.headers.get("x-user-role") || "";
    const isSuperAdmin = req.headers.get("x-is-super-admin") === "true";
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!isSuperAdmin && !["SUPER_ADMIN", "ADMIN"].includes(role)) {
      return NextResponse.json({ success: false, message: "Admin access required" }, { status: 403 });
    }

    await connectDB();

    const { id } = await context.params;
    const body = await req.json();
    const { status } = body ?? {};

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { success: false, message: "status must be APPROVED or REJECTED" },
        { status: 400 }
      );
    }

    const review = await Review.findByIdAndUpdate(id, { status }, { new: true });
    if (!review) {
      return NextResponse.json({ success: false, message: "Review not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      review: { id: String(review._id), status: review.status },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
