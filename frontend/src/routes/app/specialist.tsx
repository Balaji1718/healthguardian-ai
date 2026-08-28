import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, Info, Sparkles, Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUid } from "@/features/auth/useAuth";
import { useGuidance } from "@/features/health/queries";
import { acknowledgeGuidance, toDate } from "@/services/firebase/repositories";
import { ContextualHelp } from "@/features/guide/ContextualHelp";

export const Route = createFileRoute("/app/specialist")({
  component: SpecialistPage,
  head: () => ({
    meta: [
      { title: "Specialist Guidance — HealthGuardian AI" },
      {
        name: "description",
        content:
          "Advisory suggestions on healthcare provider categories to discuss during clinical appointments.",
      },
      { property: "og:title", content: "Specialist Guidance" },
      {
        property: "og:description",
        content: "Advisory clinical discussion categories based on your logged patterns.",
      },
    ],
  }),
});

export function SpecialistPage() {
  const uid = useUid();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useGuidance(uid);

  if (isLoading) return <LoadingState label="Loading specialist guidance…" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const items = data ?? [];

  return (
    <div>
      <PageHeader
        title="Specialist guidance"
        description="Structured suggestions regarding which category of healthcare professional you might consider discussing recurring patterns with during a routine visit."
        action={
          <ContextualHelp content="Specialist Guidance is advisory and non-diagnostic. It does not replace clinical evaluation or make medical referrals." />
        }
      />

      {/* Purpose Definition Card */}
      <div className="surface mb-6 p-4.5 border-primary/20 bg-primary/5 rounded-2xl flex items-start gap-3 text-xs text-muted-foreground">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">How Specialist Guidance Works</p>
          <p className="leading-relaxed">
            When HealthGuardian detects persistent patterns across your logged metrics (such as
            sleep deviations or blood pressure trends), it highlights relevant medical specialties
            (e.g. Cardiology, Endocrinology, Sleep Medicine) for your reference. It is strictly
            non-diagnostic and non-referral.
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="No suggestions yet"
          description="Suggestions appear when HealthGuardian identifies a recurring pattern that may be worth discussing with a healthcare professional."
        />
      ) : (
        <ul className="space-y-4">
          {items.map((g) => (
            <li key={g.id} className="surface p-5 space-y-3 rounded-2xl shadow-xs border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Stethoscope className="size-4" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base text-foreground">
                      {g.suggestedSpecialty}
                    </h2>
                    <span className="text-[11px] text-muted-foreground">
                      Advisory Discussion Category
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`capitalize text-xs font-semibold ${
                      g.urgency === "high"
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : g.urgency === "moderate"
                          ? "border-warning/30 bg-warning/10 text-warning-foreground"
                          : "border-primary/30 bg-primary/10 text-primary"
                    }`}
                  >
                    {g.urgency} priority
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {toDate(g.createdAt ?? null)?.toLocaleDateString() ?? ""}
                  </span>
                </div>
              </div>

              {/* Advisory Wording */}
              <p className="text-xs font-medium text-foreground">
                Recurring pattern observed in your logged records. Consider discussing this pattern
                with an appropriate healthcare professional.
              </p>

              {/* Basis Details */}
              <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
                <span className="font-semibold text-foreground block">Observed Basis:</span>
                <p className="leading-relaxed">{g.basis}</p>
              </div>

              {/* Actions & AI Assistant Relationship */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Need more explanation?</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 gap-1"
                    onClick={() => void navigate({ to: "/app/assistant" })}
                  >
                    <Bot className="size-3.5" /> Ask AI Assistant
                  </Button>
                </div>

                {g.userAcknowledged ? (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
                    <CheckCircle2 className="size-3.5 text-success" /> Acknowledged
                  </span>
                ) : (
                  g.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 gap-1"
                      onClick={async () => {
                        await acknowledgeGuidance(uid!, g.id!);
                        await qc.invalidateQueries({ queryKey: ["guidance"] });
                      }}
                    >
                      <CheckCircle2 className="size-3" /> I've read this
                    </Button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Disclaimer>
        These suggestions point to a category of care based on your logged patterns. They are not a
        diagnosis, and urgent or severe symptoms always warrant immediate medical attention.
      </Disclaimer>
    </div>
  );
}
