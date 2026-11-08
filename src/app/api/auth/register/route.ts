import { NextResponse } from "next/server";
import { createNonprofitAccount, DuplicateAccountError } from "@/lib/accounts";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { nonprofitRegistrationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid registration details." }, { status: 400 });
  }

  const parsed = nonprofitRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please review the highlighted account and organization details.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    await createNonprofitAccount(parsed.data);
    return NextResponse.json({ message: "Your account has been created. You can now log in." }, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateAccountError) {
      return NextResponse.json({ error: `That ${error.field} is already registered.` }, { status: 409 });
    }
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Nonprofit account registration failed.", error);
    return NextResponse.json(
      { error: "We could not create your account right now. Please try again later." },
      { status: 500 },
    );
  }
}
