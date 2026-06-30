import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ChatRoom } from "@/models/ChatMessage";

export async function GET(req: Request) {
  try {
    await connectDB();
    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ success: false, message: "Auth required" }, { status: 401 });

    const rooms = await ChatRoom.find({
      $or: [{ members: userId }, { type: "CHANNEL" }],
      isActive: true,
    }).sort({ lastMessageAt: -1 }).lean();

    return NextResponse.json({ success: true, rooms });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const userId = req.headers.get("x-user-id");
    const userName = req.headers.get("x-user-name");
    if (!userId) return NextResponse.json({ success: false, message: "Auth required" }, { status: 401 });

    const body = await req.json();
    const room = await ChatRoom.create({
      ...body,
      createdBy: userId,
      members: [...(body.members || []), userId],
    });

    return NextResponse.json({ success: true, room });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
