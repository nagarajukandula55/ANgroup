import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ChatMessage, ChatRoom } from "@/models/ChatMessage";

export async function GET(req: Request) {
  try {
    await connectDB();
    const url = new URL(req.url);
    const roomId = url.searchParams.get("roomId");
    const before = url.searchParams.get("before");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    if (!roomId) return NextResponse.json({ success: false, message: "roomId required" }, { status: 400 });

    const filter: any = { roomId, isDeleted: false };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ success: true, messages: messages.reverse() });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectDB();
    const userId = req.headers.get("x-user-id");
    const userName = req.headers.get("x-user-name") || "User";
    if (!userId) return NextResponse.json({ success: false, message: "Auth required" }, { status: 401 });

    const body = await req.json();
    const { roomId, content, type = "TEXT", fileUrl, fileName, fileSize, replyTo } = body;

    if (!roomId || !content) {
      return NextResponse.json({ success: false, message: "roomId and content required" }, { status: 400 });
    }

    const message = await ChatMessage.create({
      roomId, senderId: userId, senderName: userName,
      content, type, fileUrl, fileName, fileSize, replyTo,
    });

    // Update room's lastMessageAt
    await ChatRoom.findByIdAndUpdate(roomId, { lastMessageAt: new Date() });

    return NextResponse.json({ success: true, message });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
