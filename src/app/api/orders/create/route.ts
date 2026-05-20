import { NextResponse } from "next/server";
import { connectNativeDB } from "@/lib/native-mongodb";
import { OrderService } from "@/services/order.service";

const allowedOrigins = [
  "https://shopnative.in",
  "https://www.shopnative.in",
  "https://angroup.in",
  "https://www.angroup.in",
];

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin":
      origin && allowedOrigins.includes(origin)
        ? origin
        : "",
    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
  };
}

/* =========================================
   OPTIONS (Preflight)
========================================= */

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}

/* =========================================
   POST
========================================= */

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    console.log(
      "============ CREATE ORDER API ============"
    );

    await connectNativeDB();

    const body = await req.json();

    console.log(
      "ORDER PAYLOAD:",
      JSON.stringify(body, null, 2)
    );

    const result =
      await OrderService.createOrder(body);

    console.log(
      "ORDER CREATED:",
      result.orderId
    );

    return NextResponse.json(
      {
        success: true,
        orderId: result.orderId,
        amount: result.amount,
        items: result.items,
      },
      {
        headers: getCorsHeaders(origin),
      }
    );

  } catch (err: any) {
    console.error("ORDER CREATE FAILED:");
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: err?.message,
      },
      {
        status: 500,
        headers: getCorsHeaders(origin),
      }
    );
  }
}
