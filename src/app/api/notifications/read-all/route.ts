import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { markAllUserNotificationsAsRead } from "@/lib/notifications";

export async function PATCH() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please log in to update notifications." }, { status: 401 });
    if (user.role !== "NONPROFIT_STAFF" || !user.organizationId) {
      return NextResponse.json({ error: "Notifications are available to nonprofit staff accounts." }, { status: 403 });
    }
    await markAllUserNotificationsAsRead(user.id, user.organizationId);
    return NextResponse.json({ message: "All notifications marked as read." });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Marking all nonprofit notifications as read failed.", error);
    return NextResponse.json({ error: "We could not update your notifications. Please try again later." }, { status: 500 });
  }
}
