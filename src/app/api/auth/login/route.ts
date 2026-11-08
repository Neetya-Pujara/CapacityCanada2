import { NextResponse } from "next/server";
import { authenticateUser, createLoginSession } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid login details." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter your account type, username or email, and password." }, { status: 400 });
  }
  if (
    parsed.data.accountType === "CAPACITY_CANADA_ADMIN" &&
    !/^[a-z0-9._-]{3,32}$/i.test(parsed.data.identity)
  ) {
    return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
  }

  try {
    const user = await authenticateUser(
      parsed.data.identity,
      parsed.data.password,
      parsed.data.accountType,
    );
    if (!user) {
      return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
    }

    await createLoginSession(user.id, parsed.data.remember);
    return NextResponse.json({
      redirectTo: user.role === "CAPACITY_CANADA_ADMIN" ? "/admin" : "/dashboard",
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Account login failed.", error);
    return NextResponse.json({ error: "We could not log you in right now. Please try again later." }, { status: 500 });
  }
}
