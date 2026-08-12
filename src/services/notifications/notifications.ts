import { createNotification, listNotifications, updateNotification } from "@/services/firebase/repositories";
import type { AppNotification } from "@/models";
import type { DetectedPattern } from "@/features/healthRisk/engine";

/**
 * Notification strategy (free-tier, no Cloud Functions):
 * - in-app notification centre (always works)
 * - browser Notification API when the user grants permission
 * - event-driven: created when the app detects something while it is open
 *
 * TODO (limitation): true server-pushed background notifications need FCM +
 * a server to send them. Without paid/always-on infrastructure the app does
 * NOT claim 24/7 monitoring; reminders surface in-app and when the app is open.
 */

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Sensitive clinical detail is never placed in notification text. */
export function showBrowserNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png", tag: "healthguardian" });
    return true;
  } catch {
    return false;
  }
}

export async function pushNotification(uid: string, n: Omit<AppNotification, "status"> & { status?: AppNotification["status"] }) {
  const delivered = showBrowserNotification(n.title, n.message);
  return createNotification(uid, {
    ...n,
    status: delivered ? "delivered" : (n.status ?? "pending"),
    ...(delivered ? { deliveredAt: new Date() } : {}),
  } as AppNotification);
}

const DEDUPE_KEY = "hg_pattern_alerts";

/** Context-aware alerts, deduplicated per day so we never spam the user. */
export async function syncPatternNotifications(uid: string, patterns: DetectedPattern[]) {
  if (typeof window === "undefined") return;
  const today = new Date().toISOString().slice(0, 10);
  let seen: Record<string, string> = {};
  try {
    seen = JSON.parse(window.localStorage.getItem(DEDUPE_KEY) ?? "{}") as Record<string, string>;
  } catch {
    seen = {};
  }
  for (const p of patterns.filter((x) => x.severity >= 1)) {
    const key = `${uid}:${p.factor}`;
    if (seen[key] === today) continue;
    seen[key] = today;
    await pushNotification(uid, {
      type: "pattern_alert",
      category: p.category,
      title: "Something in your health data may need attention",
      message: "Open HealthGuardian to review the pattern we noticed in your recent entries.",
      priority: p.severity === 2 ? "high" : "medium",
    });
  }
  window.localStorage.setItem(DEDUPE_KEY, JSON.stringify(seen));
}

export async function markRead(uid: string, id: string) {
  await updateNotification(uid, id, { status: "read" });
}

export async function dismiss(uid: string, id: string) {
  await updateNotification(uid, id, { status: "dismissed" });
}

export const loadNotifications = listNotifications;
