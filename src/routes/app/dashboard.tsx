import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity, ArrowRight, CalendarCheck, Droplets, Footprints, Moon, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState, OfflineNotice } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useUid } from "@/features/auth/useAuth";
import { useAnalysis, useGoals } from "@/features/health/queries";
import { useAppStore } from "@/store/app";
import { syncPatternNotifications } from "@/services/notifications/notifications";
import { toDate } from "@/services/firebase/repositories";
import { SCORE_BANDS } from "@/core/constants/health";

export const Route = createFileRoute("/app/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard — HealthGuardian AI" },
      { name: "description", content: "Your General Health Score, recent check-ins and preventive health patterns at a glance." },
      { property: "og:title", content: "HealthGuardian dashboard" },
      { property: "og:description", content: "Your General Health Score and recent health patterns." },
    ],
  }),
});

function Dashboard() {
  const uid = useUid();
  const online = useAppStore((s) => s.online);
  const { checkins, patterns, score, isLoading, isError, refetch } = useAnalysis(uid);
  const goals = useGoals(uid);

  useEffect(() => {
    if (uid && patterns.length) void syncPatternNotifications(uid, patterns);
  }, [uid, patterns]);

  const today = new Date().toDateString();
  const doneToday = checkins.some((c) => toDate(c.date)?.toDateString() === today);
  const last = checkins[0];

  if (isLoading) return <LoadingState label="Loading your health summary…" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div>
      {!online && <OfflineNotice />}
      <PageHeader
        title="Your health summary"
        description="Everything here is computed from what you logged. Nothing is assumed or filled in for you."
        action={
          <Button asChild>
            <Link to="/app/checkin">
              <CalendarCheck className="mr-2 size-4" />
              {doneToday ? "Update today" : "Daily check-in"}
            </Link>
          </Button>
        }
      />

      {checkins.length === 0 ? (
        <EmptyState
          title="No check-ins yet"
          description="Your score and patterns appear after your first daily check-in. It takes about a minute."
          action={
            <Button asChild className="mt-2">
              <Link to="/app/checkin">Start your first check-in</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <section className="surface p-6 md:col-span-2">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">General Health Score</h2>
              <Badge variant="secondary">{SCORE_BANDS[score.band]}</Badge>
            </div>
            <p className="mt-2 text-5xl font-semibold tracking-tight">{score.score}</p>
            <Progress value={score.score} className="mt-4" />
            <p className="mt-3 text-xs text-muted-foreground">
              A wellness indicator based on your logged habits and readings — not a medical or diagnostic score.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {score.contributions.slice(0, 5).map((c, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">{c.label}</span>
                  <span className={c.delta < 0 ? "text-destructive" : "text-success"}>
                    {c.delta > 0 ? `+${c.delta}` : c.delta}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="surface p-6">
            <h2 className="text-sm font-medium text-muted-foreground">Most recent entry</h2>
            <p className="mt-1 text-sm">{last ? toDate(last.date)?.toLocaleDateString() : "—"}</p>
            <dl className="mt-4 space-y-3 text-sm">
              <Metric icon={Moon} label="Sleep" value={last?.sleepHours != null ? `${last.sleepHours} h` : "Not logged"} />
              <Metric icon={Droplets} label="Water" value={last?.waterGlasses != null ? `${last.waterGlasses} glasses` : "Not logged"} />
              <Metric
                icon={Footprints}
                label="Exercise"
                value={last?.exerciseMinutes != null ? `${last.exerciseMinutes} min` : "Not logged"}
              />
            </dl>
          </section>

          <section className="surface p-6 md:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Activity className="size-4" /> Patterns detected
              </h2>
              <Link to="/app/risk" className="text-sm text-primary hover:underline">
                View all
              </Link>
            </div>
            {patterns.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No notable patterns in your recent entries. Keep logging so trends can be seen over time.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {patterns.slice(0, 4).map((p) => (
                  <li key={p.factor} className="flex items-start gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <span
                      className={
                        p.severity === 2 ? "mt-1.5 size-2 shrink-0 rounded-full bg-destructive" : "mt-1.5 size-2 shrink-0 rounded-full bg-warning"
                      }
                    />
                    <span>{p.detail}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface p-6">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="size-4" /> Active goals
            </h2>
            {(goals.data ?? []).filter((g) => g.status === "active").length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No active goals yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {(goals.data ?? [])
                  .filter((g) => g.status === "active")
                  .slice(0, 3)
                  .map((g) => (
                    <li key={g.id}>
                      <p className="text-sm font-medium">{g.title}</p>
                      <Progress
                        className="mt-1.5"
                        value={g.targetValue ? Math.min(100, (g.progressValue / g.targetValue) * 100) : 0}
                      />
                    </li>
                  ))}
              </ul>
            )}
            <Button asChild variant="ghost" size="sm" className="mt-4 px-0">
              <Link to="/app/goals">
                Manage goals <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </section>
        </div>
      )}

      <Disclaimer />
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Moon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
