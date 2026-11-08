import { NextResponse } from "next/server";
import { destroyCurrentSession } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";

export async function POST() {
  try {
    await destroyCurrentSession();
    return NextResponse.json({ message: "You have been logged out." });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Logout failed.", error);
    return NextResponse.json({ error: "We could not complete logout. Please try again." }, { status: 500 });
  }
}
