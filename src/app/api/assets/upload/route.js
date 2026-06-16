import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { connectDB } from "@/lib/mongodb";
import Asset from "@/models/Asset";

export async function POST(req) {
  try {
    await connectDB();

    const formData = await req.formData();

    const file = formData.get("file");
    const name = formData.get("name");
    const category = formData.get("category");

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // 🔒 basic validation
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files allowed" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const base64 = `data:${file.type};base64,${buffer.toString(
      "base64"
    )}`;

    // 🚀 MAIN UPLOAD (optimized)
    const uploadResult = await cloudinary.uploader.upload(base64, {
      folder: "an-assets",
      resource_type: "image",
      quality: "auto",
      fetch_format: "auto",
    });

    // 🖼️ thumbnail (true optimized version)
    const thumbnailUrl = cloudinary.url(uploadResult.public_id, {
      width: 300,
      crop: "scale",
      quality: "auto",
      fetch_format: "auto",
    });

    const asset = await Asset.create({
      name: name || "Untitled Asset",
      category: category || "logo",
      fileUrl: uploadResult.secure_url,
      thumbnailUrl,
      fileType: file.type,
      size: buffer.length,
      tags: [],
    });

    return NextResponse.json({
      success: true,
      asset,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
