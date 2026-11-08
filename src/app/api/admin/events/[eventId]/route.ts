import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { deleteAdminEvent, saveAdminEvent } from "@/lib/events";
import { eventInputSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ eventId: string }> };

async function authorizeAdmin() {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: "Please log in to manage events." }, { status: 401 }) };
  if (user.role !== "CAPACITY_CANADA_ADMIN") {
    return { response: NextResponse.json({ error: "Capacity Canada admin access is required." }, { status: 403 }) };
  }
  return { user };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const auth = await authorizeAdmin();
    if ("response" in auth) return auth.response;
    const { eventId } = await params;
    const id = z.string().uuid().safeParse(eventId);
    if (!id.success) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Submit valid event details." }, { status: 400 });
    }
    const parsed = eventInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the event details and try again.", details: parsed.error.flatten() }, { status: 400 });
    }
    const event = await saveAdminEvent(parsed.data, id.data);
    if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    return NextResponse.json({ event });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Updating admin event failed.", error);
    return NextResponse.json({ error: "We could not update the event. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const auth = await authorizeAdmin();
    if ("response" in auth) return auth.response;
    const { eventId } = await params;
    const id = z.string().uuid().safeParse(eventId);
    if (!id.success) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    const deleted = await deleteAdminEvent(id.data);
    if (!deleted) return NextResponse.json({ error: "Event not found." }, { status: 404 });
    return NextResponse.json({ message: "Event deleted." });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Deleting admin event failed.", error);
    return NextResponse.json({ error: "We could not delete the event. Please try again later." }, { status: 500 });
  }
}
