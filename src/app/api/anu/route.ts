import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/core/db/mongodb";
import { askAnu } from "@/core/anu/anuService";
import type { AnuMessage } from "@/core/anu/types";

// POST /api/anu — ask ANu (the in-house AI assistant) a question, grounded
// in this business's actual enabled modules and platform knowledge. Body:
// { businessId: string, messages: AnuMessage[] } where messages is the full
// conversation so far (oldest first); the caller (UI) owns history/trimming.
export async function POST(req: NextRequest) {
  try {
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const businessId: string | undefined = body?.businessId;
    const messages: AnuMessage[] | undefined = body?.messages;

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required and must be non-empty" }, { status: 400 });
    }

    await connectDB();
    const result = await askAnu({ businessId, userId, messages });

    if (result.error) {
      // Not a 500 — this is an expected "not configured yet" state, not a
      // server failure, so the UI can show a friendly setup prompt.
      return NextResponse.json({ success: false, error: result.error }, { status: 200 });
    }

    return NextResponse.json({ success: true, reply: result.reply, provider: result.provider });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
