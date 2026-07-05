import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Blog from "@/models/Blog";
import { logAction } from "@/lib/audit/logAction";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    if (!body?.title) {
      return NextResponse.json(
        {
          success: false,
          message: "Title is required",
        },
        {
          status: 400,
        }
      );
    }

    const slug = body.title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const blog = await Blog.create({
      title: body.title,
      slug,
      excerpt: body.excerpt || "",
      content: body.content || "",
      image: body.image || "",
      category: body.category || "General",
    });

    logAction({
      action: "CREATE",
      entity: "Blog",
      entityId: blog._id.toString(),
      after: blog,
      req: request,
    });

    return NextResponse.json({
      success: true,
      blog,
    });
  } catch (error: any) {
    console.error("BLOG CREATE ERROR:", error);

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
