import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";
import Coupon from "@/models/Coupon";

// GET /api/coupons?businessId=...&status=...&search=...
export async function GET(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    await connectDB();

    const query: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
    };

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const coupons = await Coupon.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, coupons });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/coupons
export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      businessId,
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscountAmount,
      usageLimit,
      perUserLimit,
      validFrom,
      validUntil,
      status,
      applicableProducts,
      applicableCategories,
    } = body;

    if (!businessId || !code || !discountType || discountValue === undefined) {
      return NextResponse.json(
        { error: "businessId, code, discountType, and discountValue are required" },
        { status: 400 }
      );
    }

    if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
      return NextResponse.json({ error: "Invalid discountType" }, { status: 400 });
    }

    if (discountType === "PERCENTAGE" && (discountValue < 0 || discountValue > 100)) {
      return NextResponse.json(
        { error: "Percentage discount must be between 0 and 100" },
        { status: 400 }
      );
    }

    if (discountValue < 0) {
      return NextResponse.json({ error: "discountValue must be non-negative" }, { status: 400 });
    }

    await connectDB();

    const coupon = await Coupon.create({
      businessId: new Types.ObjectId(businessId),
      code: code.toUpperCase().trim(),
      description,
      discountType,
      discountValue,
      minOrderValue: minOrderValue ?? 0,
      maxDiscountAmount,
      usageLimit,
      perUserLimit,
      validFrom: validFrom ? new Date(validFrom) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      status: status ?? "ACTIVE",
      applicableProducts: applicableProducts
        ? applicableProducts.map((id: string) => new Types.ObjectId(id))
        : [],
      applicableCategories: applicableCategories ?? [],
      createdBy: new Types.ObjectId(userId),
    });

    return NextResponse.json({ success: true, coupon }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    // Duplicate key = code already exists for this business
    if (message.includes("duplicate key") || message.includes("E11000")) {
      return NextResponse.json(
        { success: false, error: "A coupon with this code already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
