import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { deleteResource, updateResource } from "@/lib/resources";
import { resourceInputSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ resourceId: string }> };

async function authorizeAdmin() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please log in to manage resources." }, { status: 401 });
  if (user.role !== "CAPACITY_CANADA_ADMIN") {
    return NextResponse.json({ error: "Capacity Canada admin access is required." }, { status: 403 });
  }
  return null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const denied = await authorizeAdmin();
    if (denied) return denied;
    const { resourceId } = await params;
    const id = z.string().uuid().safeParse(resourceId);
    if (!id.success) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
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
    const resource = await updateResource(id.data, parsed.data);
    if (!resource) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    return NextResponse.json({ resource });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Updating resource failed.", error);
    return NextResponse.json({ error: "We could not update this resource. Please try again later." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const denied = await authorizeAdmin();
    if (denied) return denied;
    const { resourceId } = await params;
    const id = z.string().uuid().safeParse(resourceId);
    if (!id.success) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    const deleted = await deleteResource(id.data);
    if (!deleted) return NextResponse.json({ error: "Resource not found." }, { status: 404 });
    return NextResponse.json({ message: "Resource deleted." });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Deleting resource failed.", error);
    return NextResponse.json({ error: "We could not delete this resource. Please try again later." }, { status: 500 });
  }
}
