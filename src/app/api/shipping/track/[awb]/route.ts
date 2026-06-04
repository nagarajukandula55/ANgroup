export async function GET(
  request: Request,
  context: {
    params: Promise<{
      awb: string;
    }>;
  }
) {
  try {
    await connectDB();

    const { awb } =
      await context.params;

    const result =
      await syncTracking(awb);

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
