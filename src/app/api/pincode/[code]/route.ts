import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${params.code}`,
      {
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (
      !data?.[0] ||
      data[0].Status !== "Success"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pincode",
        },
        { status: 404 }
      );
    }

    const po =
      data[0]?.PostOffice?.[0];

    return NextResponse.json({
      success: true,
      city: po?.District || "",
      state: po?.State || "",
      country: po?.Country || "India",
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
