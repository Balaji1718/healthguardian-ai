import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Target } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, EmptyState, ErrorState, LoadingState } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useUid } from "@/features/auth/useAuth";
import { useGoals } from "@/features/health/queries";
import { goalSchema } from "@/core/validation/schemas";
import { GOAL_TYPES } from "@/core/constants/health";
import { createGoal, updateGoal } from "@/services/firebase/repositories";
import { ContextualHelp } from "@/features/guide/ContextualHelp";

export const Route = createFileRoute("/app/goals")({
  component: GoalsPage,
  head: () => ({
    meta: [
      { title: "Health goals — HealthGuardian AI" },
      {
        name: "description",
        content: "Set realistic lifestyle goals and track progress from your own check-ins.",
      },
      { property: "og:title", content: "Your health goals" },
      {
        property: "og:description",
        content: "Set realistic lifestyle goals and track progress over time.",
      },
    ],
  }),
});

function GoalsPage() {
  const uid = useUid();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useGoals(uid);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    goalType: "exercise",
    targetValue: "",
    unit: "",
    frequency: "daily",
    targetDate: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (isLoading) return <LoadingState label="Loading your goals…" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    const parsed = goalSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await createGoal(uid, {
        title: form.title,
        goalType: form.goalType,
        targetValue: parsed.data.targetValue,
        unit: form.unit || undefined,
        frequency: form.frequency,
        startDate: new Date(),
        targetDate: form.targetDate ? new Date(`${form.targetDate}T00:00:00`) : undefined,
        status: "active",
        progressValue: 0,
      });
      await qc.invalidateQueries({ queryKey: ["goals"] });
      setOpen(false);
      setForm({
        title: "",
        goalType: "exercise",
        targetValue: "",
        unit: "",
        frequency: "daily",
        targetDate: "",
      });
      toast.success("Goal created.");
    } catch {
      toast.error("Could not create the goal.");
    } finally {
      setBusy(false);
    }
  };

  const complete = async (id: string) => {
    if (!uid) return;
    await updateGoal(uid, id, { status: "completed" });
    await qc.invalidateQueries({ queryKey: ["goals"] });
  };

  const goals = data ?? [];

  return (
    <div>
      <PageHeader
        title="Goals"
        description="Small, realistic goals work best. Progress is only ever based on what you actually log."
        action={
          <div className="flex items-center gap-2">
            <ContextualHelp content="Progress is calculated strictly from your daily check-in logs. AI suggestions always require your approval." />
            <Button onClick={() => setOpen((v) => !v)}>
              <Plus className="mr-2 size-4" /> New goal
            </Button>
          </div>
        }
      />

      {open && (
        <form onSubmit={submit} className="surface mb-6 grid gap-4 p-6 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="title">Goal</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Walk 30 minutes a day"
            />
            {errors["title"] && <p className="text-xs text-destructive">{errors["title"]}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goalType">Area</Label>
            <select
              id="goalType"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={form.goalType}
              onChange={(e) => setForm({ ...form, goalType: e.target.value })}
            >
              {GOAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="frequency">Frequency</Label>
            <select
              id="frequency"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
            >
              {["daily", "weekly", "monthly"].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="targetValue">Target value</Label>
            <Input
              id="targetValue"
              type="number"
              value={form.targetValue}
              onChange={(e) => setForm({ ...form, targetValue: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="minutes, glasses, kg"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 size-4 animate-spin" />} Create goal
            </Button>
          </div>
        </form>
      )}

      {goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Create a goal to give your check-ins something to aim at."
        />
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li key={g.id} className="surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <Target className="size-4 text-primary" /> {g.title}
                </span>
                <Badge
                  variant={g.status === "active" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {g.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {g.frequency} ·{" "}
                {g.targetValue != null
                  ? `${g.progressValue}/${g.targetValue} ${g.unit ?? ""}`
                  : "no numeric target"}
              </p>
              {g.targetValue != null && (
                <Progress
                  className="mt-3"
                  value={Math.min(100, (g.progressValue / g.targetValue) * 100)}
                />
              )}
              {g.status === "active" && g.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 px-0"
                  onClick={() => void complete(g.id!)}
                >
                  Mark completed
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Disclaimer />
    </div>
  );
}
