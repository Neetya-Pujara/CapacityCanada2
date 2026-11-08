import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { createResource, listResources } from "@/lib/resources";
import { resourceInputSchema, SUPPORT_AREAS } from "@/lib/validation";

async function authorizeAdmin() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in to manage resources." }, { status: 401 });
  if (user.role !== "CAPACITY_CANADA_ADMIN") {
    return NextResponse.json({ error: "Capacity Canada admin access is required." }, { status: 403 });
  }
  return null;
}

export async function GET(request: Request) {
  try {
    const denied = await authorizeAdmin();
    if (denied) return denied;
    const params = new URL(request.url).searchParams;
    const search = params.get("search")?.trim().slice(0, 200) || undefined;
    const rawCategory = params.get("category") || undefined;
    if (rawCategory && !SUPPORT_AREAS.includes(rawCategory as (typeof SUPPORT_AREAS)[number])) {
      return NextResponse.json({ error: "Choose a valid resource category." }, { status: 400 });
    }
    return NextResponse.json({
      resources: await listResources({
        search,
        category: rawCategory as (typeof SUPPORT_AREAS)[number] | undefined,
      }),
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Loading resource library failed.", error);
    return NextResponse.json({ error: "We could not load resources. Please try again later." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const denied = await authorizeAdmin();
    if (denied) return denied;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Submit valid resource details." }, { status: 400 });
    }
    const parsed = resourceInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Check the resource details and try again.", details: parsed.error.flatten() }, { status: 400 });
    }
    const resource = await createResource(parsed.data);
    return NextResponse.json({ resource }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Creating resource failed.", error);
    return NextResponse.json({ error: "We could not save this resource. Please try again later." }, { status: 500 });
  }
}
