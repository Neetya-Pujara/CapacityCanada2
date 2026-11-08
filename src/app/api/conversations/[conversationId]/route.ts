import { NextResponse } from "next/server";
import {
  deleteUserConversation,
  getUserConversation,
} from "@/lib/conversations";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { z } from "zod";

type RouteContext = { params: Promise<{ conversationId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to view this conversation." }, { status: 401 });
    if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
      return NextResponse.json({ error: "The AI assistant is available to nonprofit staff accounts." }, { status: 403 });
    }
    const { conversationId } = await params;
    const parsedId = z.string().uuid().safeParse(conversationId);
    if (!parsedId.success) return NextResponse.json({ error: "That conversation could not be found." }, { status: 404 });
    const conversation = await getUserConversation(user.id, parsedId.data);
    if (!conversation) return NextResponse.json({ error: "That conversation could not be found." }, { status: 404 });
    return NextResponse.json({ conversation });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Loading a nonprofit conversation failed.", error);
    return NextResponse.json({ error: "We could not load this conversation. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to delete conversations." }, { status: 401 });
    if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
      return NextResponse.json({ error: "The AI assistant is available to nonprofit staff accounts." }, { status: 403 });
    }
    const { conversationId } = await params;
    const parsedId = z.string().uuid().safeParse(conversationId);
    if (!parsedId.success) return NextResponse.json({ error: "That conversation could not be found." }, { status: 404 });
    const deleted = await deleteUserConversation(user.id, parsedId.data);
    if (!deleted) return NextResponse.json({ error: "That conversation could not be found." }, { status: 404 });
    return NextResponse.json({ message: "Conversation deleted." });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Deleting a nonprofit conversation failed.", error);
    return NextResponse.json({ error: "We could not delete this conversation. Please try again later." }, { status: 500 });
  }
}
