import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUid } from "@/features/auth/useAuth";
import { useAnalysis, useAssessments } from "@/features/health/queries";
import {
  buildAssessments,
  suggestSpecialty,
  calculateAdaptiveEvidence,
} from "@/features/healthRisk/engine";
import { buildHealthContext } from "@/core/adaptive/context";
import { createGuidance, saveAssessment, toDate } from "@/services/firebase/repositories";
import { ALGORITHM_VERSION, FACTOR_LABELS, ENABLE_ADAPTIVE_V2 } from "@/core/constants/health";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, ArrowUp, Minus, HelpCircle } from "lucide-react";
import { ContextualHelp } from "@/features/guide/ContextualHelp";

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

function RiskPage() {
  const uid = useUid();
  const qc = useQueryClient();
  const { checkins, patterns, isLoading, isError, refetch } = useAnalysis(uid);
  const assessments = useAssessments(uid);
  const [saving, setSaving] = useState(false);

  const adaptiveEvidence = calculateAdaptiveEvidence(checkins);
  const healthContext = buildHealthContext(adaptiveEvidence);

  if (isLoading) return <LoadingState label="Running the analysis…" />;
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
      toast.success("Analysis saved to your record.");
    } catch {
      toast.error("Could not save the analysis. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Risk & patterns"
        description="Computed locally from your health history using adaptive personal-baseline analysis. Safety-critical checks remain deterministic."
        action={
          <Button onClick={() => void runAndSave()} disabled={saving || patterns.length === 0}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}{" "}
            Save analysis
          </Button>
        }
      />

      {ENABLE_ADAPTIVE_V2 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">
              Personal Baselines & Deviations
            </h2>
            <ContextualHelp content="Personal baselines require sufficient history (minimum 3 logged entries). Deviations reflect your recent 3-day habits relative to your own median." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {adaptiveEvidence.map((e) => {
              const label = e.metric
                .replace("Hours", "")
                .replace("Glasses", "")
                .replace("Minutes", "")
                .replace("Kg", "")
                .replace("BP", " BP")
                .replace("Glucose", " glucose");
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
                              <ArrowUp className="size-3.5 mr-0.5" /> Up
                            </span>
                          )}
                          {e.direction === "down" && (
                            <span className="flex items-center text-destructive">
                              <ArrowDown className="size-3.5 mr-0.5" /> Down
                            </span>
                          )}
                          {e.direction === "stable" && (
                            <span className="flex items-center text-muted-foreground">
                              <Minus className="size-3.5 mr-0.5" /> Stable
                            </span>
                          )}
                          {e.direction === "unknown" && (
                            <span className="flex items-center text-muted-foreground">
                              <HelpCircle className="size-3.5 mr-0.5" /> Unknown
                            </span>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Needs Data
                        </Badge>
                      )}
                    </div>

                    {hasBaseline ? (
                      <div className="space-y-2 mt-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Personal Baseline:</span>
                          <span className="font-medium">
                            {e.baseline?.toFixed(1)}
                            {unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Recent Activity:</span>
                          <span className="font-medium">
                            {e.recentMedian?.toFixed(1)}
                            {unit}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Deviation:</span>
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
                            <span>Records: {e.evidenceCount}</span>
                            <span>Confidence: {Math.round(e.confidence * 100)}%</span>
                          </div>
                          <Progress value={e.confidence * 100} className="h-1.5" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-3">
                        Log at least{" "}
                        {e.metric === "sleepHours" ||
                        e.metric === "waterGlasses" ||
                        e.metric === "exerciseMinutes"
                          ? "5"
                          : "3"}{" "}
                        entries to calculate your baseline.
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
          title="No patterns detected"
          description="Either your recent entries look steady, or there isn't enough logged data yet. Patterns need a few days of check-ins."
          action={
            <Button asChild variant="outline" className="mt-2">
              <Link to="/app/checkin">Add a check-in</Link>
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
                  <h2 className="font-medium">
                    {FACTOR_LABELS[p.factor] ?? p.factor.replace(/_/g, " ")}
                  </h2>
                  <Badge variant="secondary" className="capitalize">
                    {p.category.replace(/_/g, " ")}
                  </Badge>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${LEVEL_STYLES[p.severity === 2 ? "high" : "moderate"]}`}
                  >
                    {p.severity === 2 ? "Needs attention" : "Worth watching"}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{p.detail}</p>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Saved assessments</h2>
        {(assessments.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing saved yet. Use “Save analysis” to keep a dated snapshot.
          </p>
        ) : (
          <ul className="space-y-2">
            {(assessments.data ?? []).map((a) => (
              <li key={a.id} className="surface flex items-center justify-between p-4 text-sm">
                <span className="capitalize">{a.riskCategory.replace(/_/g, " ")}</span>
                <span className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${LEVEL_STYLES[a.riskLevel]}`}
                  >
                    {a.riskLevel}
                  </span>
                  <span className="text-muted-foreground">
                    {toDate(a.createdAt ?? null)?.toLocaleDateString() ?? ""}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Disclaimer>
        These patterns describe what your own entries show. They are not a diagnosis, a probability
        of disease, or a reason to change any medication. Discuss anything concerning with a
        qualified clinician.
      </Disclaimer>
    </div>
  );
}
