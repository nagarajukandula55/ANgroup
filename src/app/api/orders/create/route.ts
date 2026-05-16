import { NextResponse } from "next/server";

import { connectDB } from "@/lib/mongodb";
import { OrderService } from "@/services/order.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const result =
      await OrderService.createOrder(body);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error(
      "ORDER API ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,
        message:
          err.message ||
          "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
