import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { listPublishedEvents } from "@/lib/events";
import { SUPPORT_AREAS } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to browse events." }, { status: 401 });
    if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
      return NextResponse.json({ error: "Events are available to nonprofit staff accounts." }, { status: 403 });
    }
    const params = new URL(request.url).searchParams;
    const category = params.get("category") ?? undefined;
    if (category && !SUPPORT_AREAS.includes(category as (typeof SUPPORT_AREAS)[number])) {
      return NextResponse.json({ error: "Choose a valid event category." }, { status: 400 });
    }
    return NextResponse.json({
      events: await listPublishedEvents({
        search: params.get("search")?.trim().slice(0, 200) || undefined,
        category: category as (typeof SUPPORT_AREAS)[number] | undefined,
      }),
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Loading published events failed.", error);
    return NextResponse.json({ error: "We could not load events. Please try again later." }, { status: 500 });
  }
}
