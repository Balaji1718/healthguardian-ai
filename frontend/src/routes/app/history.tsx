import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { useUid } from "@/features/auth/useAuth";
import { useCheckins } from "@/features/health/queries";
import { toDate } from "@/services/firebase/repositories";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/locales/i18n";

export const Route = createFileRoute("/app/history")({
  component: History,
  head: () => ({
    meta: [
      { title: "Health history — HealthGuardian AI" },
      {
        name: "description",
        content: "Review your logged sleep, hydration, activity, weight and readings over time.",
      },
      { property: "og:title", content: "Your health history" },
      {
        property: "og:description",
        content: "Review logged sleep, hydration, activity and readings over time.",
      },
    ],
  }),
});

export function History() {
  const uid = useUid();
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useCheckins(uid, 120);
  const [metric, setMetric] = useState<
    "sleepHours" | "waterGlasses" | "exerciseMinutes" | "weightKg" | "systolicBP" | "bloodGlucose"
  >("sleepHours");

  if (isLoading) return <LoadingState label={t("common.loading")} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const checkins = data ?? [];
  const points = [...checkins]
    .reverse()
    .map((c) => ({
      date: toDate(c.date)?.toLocaleDateString(undefined, { month: "short", day: "numeric" }) ?? "",
      value: c[metric] ?? null,
    }))
    .filter((p) => typeof p.value === "number");

  const metrics = [
    { key: "sleepHours", label: `${t("dashboard.sleep")} (h)` },
    { key: "waterGlasses", label: `${t("dashboard.water")} (${t("dashboard.glasses")})` },
    { key: "exerciseMinutes", label: `${t("dashboard.exercise")} (${t("dashboard.minutes")})` },
    { key: "weightKg", label: `${t("dashboard.weight")} (kg)` },
    { key: "systolicBP", label: t("dashboard.bloodPressure") },
    { key: "bloodGlucose", label: t("dashboard.bloodGlucose") },
  ] as const;

  const getSourceLabel = (src?: string) => {
    switch (src) {
      case "quick_checkin":
        return `⚡ ${t("history.sourceQuick")}`;
      case "conversational":
        return `💬 ${t("history.sourceConversational")}`;
      case "voice":
        return `🎙️ ${t("history.sourceVoice")}`;
      case "file_import":
        return `📁 ${t("history.sourceFileImport")}`;
      case "ocr":
        return `📄 ${t("history.sourceOcr")}`;
      default:
        return `📋 ${t("history.sourceManual")}`;
    }
  };

  return (
    <div>
      <PageHeader title={t("history.title")} description={t("history.subtitle")} />

      {checkins.length === 0 ? (
        <EmptyState title={t("history.emptyTitle")} description={t("history.emptyDesc")} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {metrics.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetric(m.key)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  metric === m.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>

          <section className="surface p-4">
            {points.length < 2 ? (
              <p className="p-6 text-sm text-muted-foreground">{t("history.trendMinData")}</p>
            ) : (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="var(--color-muted-foreground)"
                    />
                    <YAxis tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        background: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "0.75rem",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="surface mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t("history.tableDate")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("history.tableSleep")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("history.tableWater")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("history.tableExercise")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("history.tableSymptoms")}</th>
                  <th className="px-4 py-2.5 font-medium">{t("history.tableSource")}</th>
                </tr>
              </thead>
              <tbody>
                {checkins.slice(0, 30).map((c) => (
                  <tr key={c.id} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-medium">
                      {toDate(c.date)?.toLocaleDateString() ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.sleepHours != null ? `${c.sleepHours}h` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.waterGlasses != null ? `${c.waterGlasses}` : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {c.exerciseMinutes != null ? `${c.exerciseMinutes}m` : "—"}
                    </td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">
                      {c.symptoms?.length ? c.symptoms.join(", ").replace(/_/g, " ") : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        {getSourceLabel(c.source)}
                      </span>
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
