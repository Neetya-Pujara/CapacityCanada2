import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { listUserNotifications, markUserNotificationAsRead } from "@/lib/notifications";

const notificationIdSchema = z.object({ notificationId: z.string().uuid() });

async function getStaffUser() {
  const user = await getCurrentUser();
  if (!user) return { response: NextResponse.json({ error: "Please log in to view notifications." }, { status: 401 }) };
  if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
    return { response: NextResponse.json({ error: "Notifications are available to nonprofit staff accounts." }, { status: 403 }) };
  }
  return { user, organizationId: user.organizationId };
}

export async function GET() {
  try {
    const auth = await getStaffUser();
    if ("response" in auth) return auth.response;
    return NextResponse.json(await listUserNotifications(auth.user.id, auth.organizationId));
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Loading nonprofit notifications failed.", error);
    return NextResponse.json({ error: "We could not load notifications. Please try again later." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await getStaffUser();
    if ("response" in auth) return auth.response;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Select a valid notification." }, { status: 400 });
    }
    const parsed = notificationIdSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Select a valid notification." }, { status: 400 });
    const updated = await markUserNotificationAsRead(
      auth.user.id,
      auth.organizationId,
      parsed.data.notificationId,
    );
    if (!updated) return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    return NextResponse.json({ message: "Notification marked as read." });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Marking a nonprofit notification as read failed.", error);
    return NextResponse.json({ error: "We could not update that notification. Please try again later." }, { status: 500 });
  }
}
