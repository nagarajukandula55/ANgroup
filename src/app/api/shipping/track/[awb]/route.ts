export const runtime = "nodejs";

import { NextResponse }
from "next/server";

import { connectDB }
from "@/lib/mongodb";

import { syncTracking }
from "@/lib/shipping/sync-tracking";

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: {
      awb: string;
    };
  }
) {
  try {
    await connectDB();

    const result =
      await syncTracking(
        params.awb
      );

    return NextResponse.json(
      result
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message:
          error.message,
      },
      {
        status: 500,
      }
    );
  }
}
