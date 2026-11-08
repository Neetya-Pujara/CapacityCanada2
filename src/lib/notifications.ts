import { and, count, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { events, notifications } from "@/lib/db/schema";

export async function listUserNotifications(userId: string, organizationId: string) {
  const conditions = and(
    eq(notifications.recipientUserId, userId),
    eq(notifications.organizationId, organizationId),
  );
  const [items, [unread]] = await Promise.all([
    getDb().select({
      id: notifications.id,
      eventId: notifications.eventId,
      title: notifications.title,
      message: notifications.message,
      reason: notifications.reason,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      eventStatus: events.status,
    })
      .from(notifications)
      .leftJoin(events, eq(notifications.eventId, events.id))
      .where(conditions)
      .orderBy(desc(notifications.createdAt))
      .limit(50),
    getDb().select({ count: count() })
      .from(notifications)
      .where(and(conditions, isNull(notifications.readAt))),
  ]);
  return {
    unreadCount: unread.count,
    notifications: items.map((item) => ({
      ...item,
      eventAvailable: item.eventStatus === "PUBLISHED",
    })),
  };
}

export async function markUserNotificationAsRead(
  userId: string,
  organizationId: string,
  notificationId: string,
) {
  const [updated] = await getDb().update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.recipientUserId, userId),
      eq(notifications.organizationId, organizationId),
    ))
    .returning({ id: notifications.id });
  return Boolean(updated);
}

export async function markAllUserNotificationsAsRead(userId: string, organizationId: string) {
  await getDb().update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.recipientUserId, userId),
      eq(notifications.organizationId, organizationId),
      isNull(notifications.readAt),
    ));
}
