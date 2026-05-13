import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { withBusinessContext } from "@/lib/withBusinessContext";

export const POST = withBusinessContext(
  async (req: Request, ctx: any) => {
    await connectDB();

    const body = await req.json();

    /* ================= BUSINESS SAFE ================= */
    const order = await Order.create({
      ...body,
      businessId: ctx.businessId,
    });

    return NextResponse.json({
      success: true,
      order,
    });
  }
);
