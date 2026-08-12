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
import { buildAssessments, suggestSpecialty } from "@/features/healthRisk/engine";
import { createGuidance, saveAssessment, toDate } from "@/services/firebase/repositories";
import { ALGORITHM_VERSION, FACTOR_LABELS } from "@/core/constants/health";

export const Route = createFileRoute("/app/risk")({
  component: RiskPage,
  head: () => ({
    meta: [
      { title: "Risk & patterns — HealthGuardian AI" },
      { name: "description", content: "Deterministic, versioned pattern detection across your logged health data." },
      { property: "og:title", content: "Risk and pattern analysis" },
      { property: "og:description", content: "Deterministic pattern detection across your logged health data." },
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
        description={`Computed locally by rule engine ${ALGORITHM_VERSION}. The same data always produces the same result — no model guesswork.`}
        action={
          <Button onClick={() => void runAndSave()} disabled={saving || patterns.length === 0}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />} Save analysis
          </Button>
        }
      />

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
                className={p.severity === 2 ? "mt-0.5 size-5 shrink-0 text-destructive" : "mt-0.5 size-5 shrink-0 text-warning"}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{FACTOR_LABELS[p.factor] ?? p.factor.replace(/_/g, " ")}</h2>
                  <Badge variant="secondary" className="capitalize">
                    {p.category.replace(/_/g, " ")}
                  </Badge>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${LEVEL_STYLES[p.severity === 2 ? "high" : "moderate"]}`}>
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
          <p className="text-sm text-muted-foreground">Nothing saved yet. Use “Save analysis” to keep a dated snapshot.</p>
        ) : (
          <ul className="space-y-2">
            {(assessments.data ?? []).map((a) => (
              <li key={a.id} className="surface flex items-center justify-between p-4 text-sm">
                <span className="capitalize">{a.riskCategory.replace(/_/g, " ")}</span>
                <span className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${LEVEL_STYLES[a.riskLevel]}`}>{a.riskLevel}</span>
                  <span className="text-muted-foreground">{toDate(a.createdAt ?? null)?.toLocaleDateString() ?? ""}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Disclaimer>
        These patterns describe what your own entries show. They are not a diagnosis, a probability of disease, or a reason to
        change any medication. Discuss anything concerning with a qualified clinician.
      </Disclaimer>
    </div>
  );
}
