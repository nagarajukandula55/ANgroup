import { NextResponse } from "next/server";
import { connectDB } from "@/lib/an-db";
import Blog from "@/models/Blog";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    const slug = body.title
      .toLowerCase()
      .replace(/ /g, "-")
      .replace(/[^\w-]+/g, "");

    const blog = await Blog.create({
      title: body.title,
      slug,
      excerpt: body.excerpt,
      content: body.content,
      image: body.image,
      category: body.category || "General",
    });

    return NextResponse.json({
      success: true,
      blog,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}
