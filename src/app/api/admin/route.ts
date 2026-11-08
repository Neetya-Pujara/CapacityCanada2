import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
    if (user.role !== "CAPACITY_CANADA_ADMIN") {
      return NextResponse.json({ error: "Capacity Canada admin access is required." }, { status: 403 });
    }
    return NextResponse.json({ id: user.id, fullName: user.fullName, username: user.username });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Verifying admin access failed.", error);
    return NextResponse.json({ error: "We could not verify your account. Please try again later." }, { status: 500 });
  }
}
