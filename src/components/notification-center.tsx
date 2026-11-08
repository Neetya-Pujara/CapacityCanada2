"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";

type UserNotification = {
  id: string;
  eventId: string | null;
  title: string;
  message: string;
  reason: string;
  readAt: string | null;
  createdAt: string;
  eventAvailable: boolean;
};

type NotificationResponse = {
  unreadCount: number;
  notifications: UserNotification[];
};

export function NotificationCenter({ variant = "dropdown" }: { variant?: "dropdown" | "page" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<NotificationResponse>({ unreadCount: 0, notifications: [] });

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const result = await response.json() as NotificationResponse & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Notifications could not be loaded.");
      setData(result);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notifications could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialRequest = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => {
      window.clearTimeout(initialRequest);
      window.clearInterval(timer);
    };
  }, [refresh]);

  async function markAsRead(notificationId: string) {
    const notification = data.notifications.find((item) => item.id === notificationId);
    if (!notification || notification.readAt) return;
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The notification could not be updated.");
      setData((current) => ({
        ...current,
        unreadCount: Math.max(0, current.unreadCount - 1),
        notifications: current.notifications.map((item) =>
          item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      }));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The notification could not be updated.");
    }
  }

  async function markAllAsRead() {
    try {
      const response = await fetch("/api/notifications/read-all", { method: "PATCH" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Notifications could not be updated.");
      const readAt = new Date().toISOString();
      setData((current) => ({
        unreadCount: 0,
        notifications: current.notifications.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      }));
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notifications could not be updated.");
    }
  }

  async function openNotification(notification: UserNotification) {
    await markAsRead(notification.id);
    setOpen(false);
    if (notification.eventAvailable && notification.eventId) {
      router.push(`/events/${encodeURIComponent(notification.eventId)}`);
    } else {
      setError("This event is no longer available. The notification remains in your history.");
    }
  }

  return (
    <div className={variant === "page" ? "notification-inbox" : "notification-center"}>
      {variant === "dropdown" && (
        <button
          type="button"
          className="notification-toggle"
          aria-label={data.unreadCount ? `Notifications, ${data.unreadCount} unread` : "Notifications"}
          aria-expanded={open}
          aria-controls="notification-panel"
          onClick={() => setOpen((value) => !value)}
        >
          <Bell size={17} />
          {data.unreadCount > 0 && <span className="notification-count">{data.unreadCount > 99 ? "99+" : data.unreadCount}</span>}
        </button>
      )}
      {(variant === "page" || open) && (
        <section className={`notification-panel${variant === "page" ? " notification-panel-page" : ""}`} id={variant === "page" ? undefined : "notification-panel"} aria-label="Notifications">
          <div className="notification-panel-heading">
            <div><h2>Notifications</h2><p>{data.unreadCount ? `${data.unreadCount} unread` : "You’re all caught up"}</p></div>
            {data.unreadCount > 0 && <button type="button" className="notification-read-all" onClick={() => void markAllAsRead()}><CheckCheck size={14} /> Mark all read</button>}
          </div>
          {error && <p className="notification-error" role="alert">{error}</p>}
          {loading ? <p className="notification-empty">Loading your notifications…</p> :
            data.notifications.length ? (
              <ul className="notification-list">
                {data.notifications.map((notification) => (
                  <li key={notification.id}>
                    {variant === "page" ? (
                      <article className={`notification-item notification-page-item${notification.readAt ? " is-read" : " is-unread"}`}>
                        <span className="notification-item-mark">{notification.readAt ? <Check size={14} /> : <span aria-hidden="true" />}</span>
                        <span className="notification-item-copy">
                          <strong>{notification.title}</strong>
                          <span>{notification.message}</span>
                          <small>{notification.reason}</small>
                          <small>{notification.eventAvailable ? "Event details are available" : "Event no longer available"}</small>
                        </span>
                        <span className="notification-page-actions">
                          {!notification.readAt && (
                            <button type="button" onClick={() => void markAsRead(notification.id)}>Mark as read</button>
                          )}
                          {notification.eventAvailable && notification.eventId && (
                            <Link href={`/events/${encodeURIComponent(notification.eventId)}`} onClick={() => void markAsRead(notification.id)}>
                              View event <ExternalLink size={12} />
                            </Link>
                          )}
                        </span>
                      </article>
                    ) : (
                      <button
                        type="button"
                        className={`notification-item${notification.readAt ? " is-read" : " is-unread"}`}
                        onClick={() => void openNotification(notification)}
                      >
                        <span className="notification-item-mark">{notification.readAt ? <Check size={14} /> : <span aria-hidden="true" />}</span>
                        <span className="notification-item-copy">
                          <strong>{notification.title}</strong>
                          <span>{notification.message}</span>
                          <small>{notification.reason}</small>
                          <small>{notification.eventAvailable ? "View event details" : "Event no longer available"} {notification.eventAvailable && <ExternalLink size={11} />}</small>
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="notification-empty">Relevant event updates will appear here when they’re published.</p>
            )}
        </section>
      )}
    </div>
  );
}
