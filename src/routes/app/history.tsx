import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { useUid } from "@/features/auth/useAuth";
import { useCheckins } from "@/features/health/queries";
import { toDate } from "@/services/firebase/repositories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/history")({
  component: History,
  head: () => ({
    meta: [
      { title: "Health history — HealthGuardian AI" },
      { name: "description", content: "Review your logged sleep, hydration, activity, weight and readings over time." },
      { property: "og:title", content: "Your health history" },
      { property: "og:description", content: "Review logged sleep, hydration, activity and readings over time." },
    ],
  }),
});

const METRICS = [
  { key: "sleepHours", label: "Sleep (h)" },
  { key: "waterGlasses", label: "Water (glasses)" },
  { key: "exerciseMinutes", label: "Exercise (min)" },
  { key: "weightKg", label: "Weight (kg)" },
  { key: "systolicBP", label: "Systolic BP" },
  { key: "bloodGlucose", label: "Glucose" },
] as const;

function History() {
  const uid = useUid();
  const { data, isLoading, isError, refetch } = useCheckins(uid, 120);
  const [metric, setMetric] = useState<(typeof METRICS)[number]["key"]>("sleepHours");

  if (isLoading) return <LoadingState label="Loading your history…" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const checkins = data ?? [];
  const points = [...checkins]
    .reverse()
    .map((c) => ({ date: toDate(c.date)?.toLocaleDateString(undefined, { month: "short", day: "numeric" }) ?? "", value: c[metric] ?? null }))
    .filter((p) => typeof p.value === "number");

  return (
    <div>
      <PageHeader title="Health history" description="Only days you logged appear here — gaps are shown as gaps, never filled in." />

      {checkins.length === 0 ? (
        <EmptyState title="Nothing logged yet" description="Your history builds up as you complete daily check-ins." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  metric === m.key ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <section className="surface p-4">
            {points.length < 2 ? (
              <p className="p-6 text-sm text-muted-foreground">
                At least two logged values are needed before a trend can be drawn for this metric.
              </p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.75rem",
                        fontSize: 12,
                      }}
                    />
                    <Line type="monotone" dataKey="value" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="surface mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Sleep</th>
                  <th className="px-4 py-2.5 font-medium">Water</th>
                  <th className="px-4 py-2.5 font-medium">Exercise</th>
                  <th className="px-4 py-2.5 font-medium">Symptoms</th>
                </tr>
              </thead>
              <tbody>
                {checkins.slice(0, 30).map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5">{toDate(c.date)?.toLocaleDateString() ?? "—"}</td>
                    <td className="px-4 py-2.5">{c.sleepHours ?? "—"}</td>
                    <td className="px-4 py-2.5">{c.waterGlasses ?? "—"}</td>
                    <td className="px-4 py-2.5">{c.exerciseMinutes ?? "—"}</td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">
                      {c.symptoms?.length ? c.symptoms.join(", ").replace(/_/g, " ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <Disclaimer />
    </div>
  );
}
