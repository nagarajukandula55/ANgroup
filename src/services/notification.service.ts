import Notification from "@/models/Notification";

/**
 * Server-side helper for other routes/services to raise a persistent,
 * user-facing notification (shows up in /admin/notifications and the
 * sidebar's unread badge) without hand-rolling Notification.create() at
 * every call site. Best-effort: a notification failing to write must never
 * break the actual operation that triggered it.
 */
export async function notifyUser({
  userId,
  businessId,
  title,
  message,
  type = "info",
  link,
}: {
  userId: string;
  businessId?: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  link?: string;
}) {
  try {
    await Notification.create({ userId, businessId, title, message, type, link });
  } catch (err) {
    console.error("[notification] failed to create notification:", err);
  }
}
