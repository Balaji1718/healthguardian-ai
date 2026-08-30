import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  RefreshCw,
  ShieldAlert,
  ArrowDown,
  ArrowUp,
  Minus,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUid } from "@/features/auth/useAuth";
import { useAnalysis, useAssessments } from "@/features/health/queries";
import {
  buildAssessments,
  suggestSpecialty,
  calculateAdaptiveEvidence,
} from "@/features/healthRisk/engine";
import { buildHealthContext } from "@/core/adaptive/context";
import { createGuidance, saveAssessment, toDate } from "@/services/firebase/repositories";
import { ENABLE_ADAPTIVE_V2 } from "@/core/constants/health";
import { ContextualHelp } from "@/features/guide/ContextualHelp";
import { formatFactorTitle, formatPatternDetail } from "@/locales/formatters";
import { useTranslation } from "@/locales/i18n";

export const Route = createFileRoute("/app/risk")({
  component: RiskPage,
  head: () => ({
    meta: [
      { title: "Risk & patterns — HealthGuardian AI" },
      {
        name: "description",
        content: "Deterministic, versioned pattern detection across your logged health data.",
      },
      { property: "og:title", content: "Risk and pattern analysis" },
      {
        property: "og:description",
        content: "Deterministic pattern detection across your logged health data.",
      },
    ],
  }),
});

const LEVEL_STYLES: Record<string, string> = {
  high: "bg-destructive/15 text-destructive",
  moderate: "bg-warning/20 text-warning-foreground",
  low: "bg-success/15 text-success",
};

export function RiskPage() {
  const uid = useUid();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { checkins, patterns, isLoading, isError, refetch } = useAnalysis(uid);
  const assessments = useAssessments(uid);
  const [saving, setSaving] = useState(false);

  const adaptiveEvidence = calculateAdaptiveEvidence(checkins);
  const healthContext = buildHealthContext(adaptiveEvidence);

  if (isLoading) return <LoadingState label={t("common.loading")} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const runAndSave = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      const ids = checkins.map((c) => c.id).filter((x): x is string => !!x);
      const built = buildAssessments(patterns, ids);
      for (const a of built) await saveAssessment(uid, a);
      const specialty = suggestSpecialty(patterns);
      if (specialty) {
        await createGuidance(uid, {
          reason: "Pattern-based preventive suggestion",
          suggestedSpecialty: specialty.specialty,
          urgency: specialty.urgency,
          basis: specialty.basis,
          userAcknowledged: false,
        });
      }
      await qc.invalidateQueries({ queryKey: ["assessments"] });
      await qc.invalidateQueries({ queryKey: ["guidance"] });
      toast.success(t("risk.savedSuccess"));
    } catch {
      toast.error(t("risk.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "sleepHours":
        return t("dashboard.sleep");
      case "waterGlasses":
        return t("dashboard.water");
      case "exerciseMinutes":
        return t("dashboard.exercise");
      case "weightKg":
        return t("dashboard.weight");
      case "bloodGlucose":
        return t("dashboard.bloodGlucose");
      case "systolicBP":
      case "diastolicBP":
        return t("dashboard.bloodPressure");
      default:
        return metric;
    }
  };

  return (
    <div>
      <PageHeader
        title={t("risk.title")}
        description={t("risk.subtitle")}
        action={
          <Button onClick={() => void runAndSave()} disabled={saving || patterns.length === 0}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}{" "}
            {t("risk.saveAnalysis")}
          </Button>
        }
      />

      {ENABLE_ADAPTIVE_V2 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{t("risk.baselinesTitle")}</h2>
            <ContextualHelp content={t("risk.contextHelp")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adaptiveEvidence.map((e) => {
              const label = getMetricLabel(e.metric);
              const unit =
                e.metric === "sleepHours"
                  ? "h"
                  : e.metric === "waterGlasses"
                    ? " glasses"
                    : e.metric === "exerciseMinutes"
                      ? "m"
                      : e.metric === "weightKg"
                        ? "kg"
                        : e.metric === "bloodGlucose"
                          ? "mg/dL"
                          : "mmHg";

              const hasBaseline = e.baseline !== null;

              return (
                <div
                  key={e.metric}
                  className="surface p-5 flex flex-col justify-between rounded-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm capitalize">{label}</h3>
                      {hasBaseline ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          {e.direction === "up" && (
                            <span className="flex items-center text-success">
                              <ArrowUp className="size-3.5 mr-0.5" /> {t("risk.up")}
                            </span>
                          )}
                          {e.direction === "down" && (
                            <span className="flex items-center text-destructive">
                              <ArrowDown className="size-3.5 mr-0.5" /> {t("risk.down")}
                            </span>
                          )}
                          {e.direction === "stable" && (
                            <span className="flex items-center text-muted-foreground">
                              <Minus className="size-3.5 mr-0.5" /> {t("risk.stable")}
                            </span>
                          )}
                          {e.direction === "unknown" && (
                            <span className="flex items-center text-muted-foreground">
                              <HelpCircle className="size-3.5 mr-0.5" /> {t("risk.unknown")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {t("risk.needsData")}
                        </Badge>
                      )}
                    </div>

                    {hasBaseline ? (
                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {t("risk.personalBaseline")}:
                          </span>
                          <span className="font-medium">
                            {e.baseline?.toFixed(1)}
                            {unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("risk.recentActivity")}:</span>
                          <span className="font-medium">
                            {e.recentMedian?.toFixed(1)}
                            {unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{t("risk.deviation")}:</span>
                          <span
                            className={`font-semibold ${e.deviation && e.deviation < 0 ? "text-destructive" : e.deviation && e.deviation > 0 ? "text-success" : "text-muted-foreground"}`}
                          >
                            {e.deviation && e.deviation > 0 ? "+" : ""}
                            {e.deviation?.toFixed(1)}
                            {unit}
                          </span>
                        </div>
                        <div className="pt-2">
                          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                            <span>
                              {t("risk.records")}: {e.evidenceCount}
                            </span>
                            <span>
                              {t("risk.confidence")}: {Math.round(e.confidence * 100)}%
                            </span>
                          </div>
                          <Progress value={e.confidence * 100} className="h-1.5" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-3">
                        {t("risk.logMinEntries", {
                          count:
                            e.metric === "sleepHours" ||
                            e.metric === "waterGlasses" ||
                            e.metric === "exerciseMinutes"
                              ? "5"
                              : "3",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {patterns.length === 0 ? (
        <EmptyState
          title={t("risk.noPatternsTitle")}
          description={t("risk.noPatternsDesc")}
          action={
            <Button asChild variant="outline" className="mt-2">
              <Link to="/app/checkin">{t("risk.addCheckin")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {patterns.map((p) => (
            <article key={p.factor} className="surface flex items-start gap-4 p-5">
              <ShieldAlert
                className={
                  p.severity === 2
                    ? "mt-0.5 size-5 shrink-0 text-destructive"
                    : "mt-0.5 size-5 shrink-0 text-warning"
                }
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">
                    {formatFactorTitle(p.factor, t)}
                  </h3>
                  <Badge
                    variant="secondary"
                    className={LEVEL_STYLES[p.severity === 2 ? "high" : "moderate"]}
                  >
                    {p.severity === 2 ? t("risk.safetyCritical") : t("risk.worthWatching")}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{formatPatternDetail(p, t)}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      <Disclaimer />
    </div>
  );
}
