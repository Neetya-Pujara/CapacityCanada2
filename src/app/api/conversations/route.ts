import { NextResponse } from "next/server";
import {
  listUserConversations,
  submitConversationMessage,
} from "@/lib/conversations";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { conversationMessageSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to view conversations." }, { status: 401 });
    if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
      return NextResponse.json({ error: "The AI assistant is available to nonprofit staff accounts." }, { status: 403 });
    }

    return NextResponse.json({ conversations: await listUserConversations(user.id) });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Loading nonprofit conversations failed.", error);
    return NextResponse.json({ error: "We could not load your conversations. Please try again later." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit a valid message." }, { status: 400 });
  }

  const parsed = conversationMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Write a message of up to 4,000 characters before sending.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to use the AI assistant." }, { status: 401 });
    if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
      return NextResponse.json({ error: "The AI assistant is available to nonprofit staff accounts." }, { status: 403 });
    }

    const result = await submitConversationMessage({
      userId: user.id,
      conversationId: parsed.data.conversationId,
      requestId: parsed.data.requestId,
      content: parsed.data.content,
    });
    if (result.kind === "completed") return NextResponse.json(result);
    if (result.kind === "in_progress") {
      return NextResponse.json(
        { error: result.error, conversationId: result.conversationId },
        { status: 409 },
      );
    }
    if (result.kind === "not_found") {
      return NextResponse.json({ error: "That conversation could not be found." }, { status: 404 });
    }
    if (result.kind === "conflict") return NextResponse.json({ error: result.error }, { status: 409 });
    return NextResponse.json(
      {
        error: result.error,
        conversationId: result.conversationId,
        userMessage: result.userMessage,
      },
      { status: result.status },
    );
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Sending a nonprofit conversation message failed.", error);
    return NextResponse.json({ error: "We could not process your message. Please try again later." }, { status: 500 });
  }
}
