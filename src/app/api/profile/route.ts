import { NextResponse } from "next/server";
import { DuplicateAccountError, updateNonprofitAccount } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getNonprofitProfile } from "@/lib/profile";
import { profileUpdateSchema } from "@/lib/validation";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to view your profile." }, { status: 401 });
    if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
      return NextResponse.json({ error: "This profile is for nonprofit staff accounts." }, { status: 403 });
    }

    const profile = await getNonprofitProfile(user.id);
    if (!profile) {
      return NextResponse.json({ error: "Your organization profile could not be found." }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Loading the nonprofit profile failed.", error);
    return NextResponse.json({ error: "We could not load your profile. Please try again later." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid profile details." }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please review the profile details.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to update your profile." }, { status: 401 });
    if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
      return NextResponse.json({ error: "This profile is for nonprofit staff accounts." }, { status: 403 });
    }
    await updateNonprofitAccount(user.id, parsed.data);
    return NextResponse.json({ message: "Your profile has been saved." });
  } catch (error) {
    if (error instanceof DuplicateAccountError) {
      return NextResponse.json({ error: `That ${error.field} is already used by another account.` }, { status: 409 });
    }
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Saving the nonprofit profile failed.", error);
    return NextResponse.json({ error: "We could not save your profile. Please try again later." }, { status: 500 });
  }
}
