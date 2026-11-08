import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { listAdminEvents, saveAdminEvent, type EventCategory, type EventStatus } from "@/lib/events";
import { eventInputSchema, SUPPORT_AREAS } from "@/lib/validation";

async function authorizeAdmin() {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: "Please log in to manage events." }, { status: 401 }) };
  if (user.role !== "CAPACITY_CANADA_ADMIN") {
    return { response: NextResponse.json({ error: "Capacity Canada admin access is required." }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: Request) {
  try {
    const auth = await authorizeAdmin();
    if ("response" in auth) return auth.response;
    const params = new URL(request.url).searchParams;
    const status = params.get("status") ?? undefined;
    const category = params.get("category") ?? undefined;
    const search = params.get("search")?.trim().slice(0, 200) || undefined;
    if (status && !["DRAFT", "PUBLISHED", "CANCELLED", "ARCHIVED"].includes(status)) {
      return NextResponse.json({ error: "Choose a valid event status." }, { status: 400 });
    }
    if (category && !SUPPORT_AREAS.includes(category as (typeof SUPPORT_AREAS)[number])) {
      return NextResponse.json({ error: "Choose a valid event category." }, { status: 400 });
    }
    const events = await listAdminEvents({
      status: status as EventStatus | undefined,
      category: category as EventCategory | undefined,
      search,
    });
    return NextResponse.json({ events });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Loading admin events failed.", error);
    return NextResponse.json({ error: "We could not load events. Please try again later." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authorizeAdmin();
    if ("response" in auth) return auth.response;
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
    const event = await saveAdminEvent(parsed.data);
    if (!event) throw new Error("The new event was not returned after saving.");
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Creating admin event failed.", error);
    return NextResponse.json({ error: "We could not save the event. Please try again later." }, { status: 500 });
  }
}
