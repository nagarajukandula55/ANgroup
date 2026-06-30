import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";
import Coupon from "@/models/Coupon";

// POST /api/coupons/validate
// Body: { businessId, code, orderValue }
// Returns: { valid, discount, finalAmount, coupon } or { valid: false, reason }
export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { businessId, code, orderValue } = body;

    if (!businessId || !code || orderValue === undefined) {
      return NextResponse.json(
        { error: "businessId, code, and orderValue are required" },
        { status: 400 }
      );
    }

    const parsedOrderValue = Number(orderValue);
    if (isNaN(parsedOrderValue) || parsedOrderValue < 0) {
      return NextResponse.json({ error: "orderValue must be a non-negative number" }, { status: 400 });
    }

    await connectDB();

    const coupon = await Coupon.findOne({
      businessId: new Types.ObjectId(businessId),
      code: code.toUpperCase().trim(),
    }).lean();

    // Not found
    if (!coupon) {
      return NextResponse.json({
        valid: false,
        reason: "Coupon code not found",
      });
    }

    // Status check
    if (coupon.status !== "ACTIVE") {
      return NextResponse.json({
        valid: false,
        reason: coupon.status === "EXPIRED" ? "This coupon has expired" : "This coupon is inactive",
      });
    }

    // Date validity
    const now = new Date();
    if (coupon.validFrom && now < coupon.validFrom) {
      return NextResponse.json({
        valid: false,
        reason: "This coupon is not yet valid",
      });
    }
    if (coupon.validUntil && now > coupon.validUntil) {
      return NextResponse.json({
        valid: false,
        reason: "This coupon has expired",
      });
    }

    // Usage limit
    if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({
        valid: false,
        reason: "This coupon has reached its usage limit",
      });
    }

    // Minimum order value
    const minOrder = coupon.minOrderValue ?? 0;
    if (parsedOrderValue < minOrder) {
      return NextResponse.json({
        valid: false,
        reason: `Minimum order value of ₹${minOrder.toLocaleString("en-IN")} required`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = (parsedOrderValue * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount !== undefined) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else {
      // FIXED
      discount = coupon.discountValue;
    }

    // Discount cannot exceed order value
    discount = Math.min(discount, parsedOrderValue);
    discount = Math.round(discount * 100) / 100; // round to 2 decimals

    const finalAmount = Math.max(0, parsedOrderValue - discount);

    return NextResponse.json({
      valid: true,
      discount,
      finalAmount: Math.round(finalAmount * 100) / 100,
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        maxDiscountAmount: coupon.maxDiscountAmount,
        validUntil: coupon.validUntil,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
