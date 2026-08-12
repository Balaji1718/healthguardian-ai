import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUid } from "@/features/auth/useAuth";
import { useGuidance } from "@/features/health/queries";
import { acknowledgeGuidance, toDate } from "@/services/firebase/repositories";

export const Route = createFileRoute("/app/specialist")({
  component: SpecialistPage,
  head: () => ({
    meta: [
      { title: "Specialist guidance — HealthGuardian AI" },
      { name: "description", content: "Which kind of clinician may be relevant, based only on patterns in your own data." },
      { property: "og:title", content: "Specialist guidance" },
      { property: "og:description", content: "Which kind of clinician may be relevant, based on your own data." },
    ],
  }),
});

function SpecialistPage() {
  const uid = useUid();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useGuidance(uid);

  if (isLoading) return <LoadingState label="Loading guidance…" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const items = data ?? [];

  return (
    <div>
      <PageHeader
        title="Specialist guidance"
        description="A suggestion about which type of clinician to talk to. It is never a diagnosis and never a referral."
      />

      {items.length === 0 ? (
        <EmptyState
          title="No suggestions yet"
          description="Suggestions appear after an analysis on Risk & patterns finds something worth discussing."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((g) => (
            <li key={g.id} className="surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Stethoscope className="size-4 text-primary" />
                <h2 className="font-medium">{g.suggestedSpecialty}</h2>
                <Badge variant="secondary" className="capitalize">
                  {g.urgency}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">{toDate(g.createdAt ?? null)?.toLocaleDateString() ?? ""}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{g.basis}</p>
              {!g.userAcknowledged && g.id && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={async () => {
                    await acknowledgeGuidance(uid!, g.id!);
                    await qc.invalidateQueries({ queryKey: ["guidance"] });
                  }}
                >
                  I've read this
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Disclaimer>
        These suggestions point to a category of care based on your logged patterns. They are not a diagnosis, and urgent or
        severe symptoms always warrant immediate medical attention.
      </Disclaimer>
    </div>
  );
}
