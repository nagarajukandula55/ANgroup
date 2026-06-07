import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Blog from "@/models/Blog";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await context.params;

    await Blog.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error("BLOG DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error?.message || "Internal Server Error",
      },
      {
        status: 500,
      }
    );
  }
}
