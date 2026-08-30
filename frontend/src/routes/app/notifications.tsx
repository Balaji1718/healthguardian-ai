import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUid } from "@/features/auth/useAuth";
import { useNotificationsQuery } from "@/features/health/queries";
import {
  dismiss,
  markRead,
  notificationPermission,
  requestNotificationPermission,
  sendTestNotification,
} from "@/services/notifications/notifications";
import { toDate } from "@/services/firebase/repositories";
import { ContextualHelp } from "@/features/guide/ContextualHelp";
import {
  formatNotificationMessage,
  formatNotificationPriority,
  formatNotificationTitle,
} from "@/locales/formatters";
import { useTranslation } from "@/locales/i18n";

export const Route = createFileRoute("/app/notifications")({
  component: NotificationsPage,
  head: () => ({
    meta: [
      { title: "Notifications — HealthGuardian AI" },
      {
        name: "description",
        content: "Reminders and context-aware alerts raised from your own health data.",
      },
      { property: "og:title", content: "Your health notifications" },
      {
        property: "og:description",
        content: "Reminders and alerts raised from your own health data.",
      },
    ],
  }),
});

export function NotificationsPage() {
  const uid = useUid();
  const qc = useQueryClient();
  const { t, language } = useTranslation();
  const { data, isLoading, isError, refetch } = useNotificationsQuery(uid);
  const [testing, setTesting] = useState(false);

  if (isLoading) return <LoadingState label={t("common.loading")} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const enable = async () => {
    const res = await requestNotificationPermission();
    if (res === "granted") toast.success(t("common.success"));
    else if (res === "unsupported") toast.error(t("common.error"));
    else toast.warning(t("common.offlineNotice"));
  };

  const handleTestNotification = async () => {
    if (!uid) return;
    setTesting(true);
    try {
      if (permission !== "granted") {
        const perm = await requestNotificationPermission();
        if (perm !== "granted") {
          toast.error(t("notifications.permissionRequired"));
        }
      }
      const delivered = await sendTestNotification(uid, language);
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      if (delivered) {
        toast.success(t("notifications.testDelivered"));
      } else {
        toast.info(t("notifications.testLogged"));
      }
    } catch {
      toast.error(t("common.error"));
    } finally {
      setTesting(false);
    }
  };

  const items = (data ?? []).filter((n) => n.status !== "dismissed");
  const permission = notificationPermission();

  return (
    <div>
      <PageHeader
        title={t("notifications.title")}
        description={t("notifications.subtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ContextualHelp content="Alerts are for awareness, not emergency monitoring. Notifications never expose private clinical details." />
            {permission !== "granted" && (
              <Button variant="outline" size="sm" onClick={() => void enable()}>
                <BellRing className="mr-2 size-4" /> {t("notifications.enableAlerts")}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={testing}
              onClick={() => void handleTestNotification()}
            >
              {testing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4 text-primary" />
              )}
              {t("notifications.testAlerts")}
            </Button>
          </div>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title={t("notifications.emptyTitle")}
          description={t("notifications.emptyDesc")}
        />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="surface flex flex-wrap items-start gap-3 p-4">
              <Bell className="mt-0.5 size-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{formatNotificationTitle(n, t)}</p>
                <p className="text-sm text-muted-foreground">{formatNotificationMessage(n, t)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {toDate(n.createdAt ?? null)?.toLocaleString() ?? ""}
                </p>
              </div>
              <Badge
                variant={n.priority === "high" ? "destructive" : "secondary"}
                className="capitalize"
              >
                {formatNotificationPriority(n.priority, t)}
              </Badge>
              {n.id && (
                <div className="flex gap-1">
                  {n.status !== "read" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await markRead(uid!, n.id!);
                        await qc.invalidateQueries({ queryKey: ["notifications"] });
                      }}
                    >
                      {t("notifications.markRead")}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await dismiss(uid!, n.id!);
                      await qc.invalidateQueries({ queryKey: ["notifications"] });
                    }}
                  >
                    {t("notifications.dismiss")}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Disclaimer />
    </div>
  );
}
