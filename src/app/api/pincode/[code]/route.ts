import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          error: "Pincode required",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      `https://api.postalpincode.in/pincode/${code}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (err: any) {
    console.error("PINCODE API ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}
