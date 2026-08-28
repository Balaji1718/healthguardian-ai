import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
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
} from "@/services/notifications/notifications";
import { toDate } from "@/services/firebase/repositories";
import { ContextualHelp } from "@/features/guide/ContextualHelp";

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

function NotificationsPage() {
  const uid = useUid();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useNotificationsQuery(uid);

  if (isLoading) return <LoadingState label="Loading notifications…" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const enable = async () => {
    const res = await requestNotificationPermission();
    if (res === "granted") toast.success("Browser notifications enabled.");
    else if (res === "unsupported") toast.error("This browser does not support notifications.");
    else toast.warning("Notifications stay in the app until you allow them in your browser.");
  };

  const items = (data ?? []).filter((n) => n.status !== "dismissed");
  const permission = notificationPermission();

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alerts are raised only from patterns in your own entries, and never contain sensitive clinical detail."
        action={
          <div className="flex items-center gap-2">
            <ContextualHelp content="Alerts are for awareness, not emergency monitoring. Notifications never expose private clinical details." />
            {permission !== "granted" && (
              <Button variant="outline" onClick={() => void enable()}>
                <BellRing className="mr-2 size-4" /> Enable browser alerts
              </Button>
            )}
          </div>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="Nothing to show"
          description="Reminders and pattern alerts will appear here as you use the app."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="surface flex flex-wrap items-start gap-3 p-4">
              <Bell className="mt-0.5 size-4 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {toDate(n.createdAt ?? null)?.toLocaleString() ?? ""}
                </p>
              </div>
              <Badge
                variant={n.priority === "high" ? "destructive" : "secondary"}
                className="capitalize"
              >
                {n.priority}
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
                      Mark read
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
                    Dismiss
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Disclaimer>
        Alerts appear while the app is open and, if you allow it, as browser notifications.
        HealthGuardian does not provide emergency monitoring — in an emergency contact local
        emergency services.
      </Disclaimer>
    </div>
  );
}
