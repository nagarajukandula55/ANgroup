import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  try {
    const res = await fetch(
      `https://api.postalpincode.in/pincode/${params.code}`,
      {
        cache: "no-store",
      }
    );

    const data = await res.json();

    return NextResponse.json(data);

  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}
