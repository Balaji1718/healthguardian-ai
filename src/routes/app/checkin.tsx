import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/AppShell";
import { Disclaimer, OfflineNotice } from "@/components/common/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { checkinSchema } from "@/core/validation/schemas";
import { COMMON_SYMPTOMS, FOOD_QUALITY_OPTIONS, WELLBEING_OPTIONS } from "@/core/constants/health";
import { checkinIdForDate, getCheckin, saveCheckin } from "@/services/firebase/repositories";
import { useUid } from "@/features/auth/useAuth";
import { useAppStore } from "@/store/app";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/checkin")({
  component: Checkin,
  head: () => ({
    meta: [
      { title: "Daily check-in — HealthGuardian AI" },
      { name: "description", content: "Log sleep, hydration, activity, symptoms and readings in about a minute." },
      { property: "og:title", content: "Daily health check-in" },
      { property: "og:description", content: "Log sleep, hydration, activity and symptoms in about a minute." },
    ],
  }),
});

type FormState = Record<string, string>;
const EMPTY: FormState = {
  sleepHours: "",
  waterGlasses: "",
  exerciseMinutes: "",
  exerciseType: "",
  foodQuality: "",
  weightKg: "",
  wellbeing: "",
  systolicBP: "",
  diastolicBP: "",
  bloodGlucose: "",
  bloodGlucoseUnit: "mg/dL",
  notes: "",
};

function Checkin() {
  const uid = useUid();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useAppStore((s) => s.online);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState<FormState>(EMPTY);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Pre-fill when an entry already exists for the chosen date.
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void (async () => {
      const existing = await getCheckin(uid, checkinIdForDate(new Date(`${date}T00:00:00`)));
      if (cancelled) return;
      if (!existing) {
        setForm(EMPTY);
        setSymptoms([]);
        return;
      }
      setForm({
        ...EMPTY,
        sleepHours: existing.sleepHours?.toString() ?? "",
        waterGlasses: existing.waterGlasses?.toString() ?? "",
        exerciseMinutes: existing.exerciseMinutes?.toString() ?? "",
        exerciseType: existing.exerciseType ?? "",
        foodQuality: existing.foodQuality ?? "",
        weightKg: existing.weightKg?.toString() ?? "",
        wellbeing: existing.wellbeing ?? "",
        systolicBP: existing.systolicBP?.toString() ?? "",
        diastolicBP: existing.diastolicBP?.toString() ?? "",
        bloodGlucose: existing.bloodGlucose?.toString() ?? "",
        bloodGlucoseUnit: existing.bloodGlucoseUnit ?? "mg/dL",
        notes: existing.notes ?? "",
      });
      setSymptoms(existing.symptoms ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, date]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    const parsed = checkinSchema.safeParse(form);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      toast.error("Please correct the highlighted values.");
      return;
    }
    setErrors({});
    const d = parsed.data;
    if ((d.systolicBP == null) !== (d.diastolicBP == null)) {
      setErrors({ systolicBP: "Enter both blood pressure numbers, or leave both blank." });
      return;
    }
    setBusy(true);
    try {
      await saveCheckin(uid, new Date(`${date}T00:00:00`), {
        sleepHours: d.sleepHours,
        waterGlasses: d.waterGlasses,
        exerciseMinutes: d.exerciseMinutes,
        exerciseType: form['exerciseType'] || undefined,
        foodQuality: form['foodQuality'] || undefined,
        weightKg: d.weightKg,
        wellbeing: form['wellbeing'] || undefined,
        systolicBP: d.systolicBP,
        diastolicBP: d.diastolicBP,
        bloodGlucose: d.bloodGlucose,
        bloodGlucoseUnit: d.bloodGlucose != null ? form['bloodGlucoseUnit'] : undefined,
        notes: form['notes'] || undefined,
        symptoms,
      });
      await qc.invalidateQueries({ queryKey: ["checkins"] });
      toast.success(online ? "Check-in saved." : "Saved locally — it will sync when you are back online.");
      await navigate({ to: "/app/dashboard" });
    } catch {
      toast.error("Could not save your check-in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {!online && <OfflineNotice />}
      <PageHeader
        title="Daily check-in"
        description="Leave anything you don't know blank — blanks stay unknown and are never treated as zero."
      />

      <form onSubmit={submit} className="space-y-4" noValidate>
        <section className="surface space-y-4 p-6">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" max={new Date().toISOString().slice(0, 10)} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </section>

        <section className="surface space-y-4 p-6">
          <h2 className="font-medium">Lifestyle</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="sleepHours" label="Sleep (hours)" value={form['sleepHours']!} onChange={set("sleepHours")} error={errors['sleepHours']} type="number" step="0.5" />
            <Field id="waterGlasses" label="Water (glasses)" value={form['waterGlasses']!} onChange={set("waterGlasses")} error={errors['waterGlasses']} type="number" />
            <Field id="exerciseMinutes" label="Exercise (minutes)" value={form['exerciseMinutes']!} onChange={set("exerciseMinutes")} error={errors['exerciseMinutes']} type="number" />
            <Field id="exerciseType" label="Exercise type" value={form['exerciseType']!} onChange={set("exerciseType")} placeholder="Walk, gym, yoga…" />
            <Field id="weightKg" label="Weight (kg)" value={form['weightKg']!} onChange={set("weightKg")} error={errors['weightKg']} type="number" step="0.1" />
          </div>
          <ChipGroup
            label="Food quality today"
            options={FOOD_QUALITY_OPTIONS as readonly string[]}
            value={form['foodQuality']!}
            onSelect={(v) => setForm((f) => ({ ...f, foodQuality: f['foodQuality'] === v ? "" : v }))}
          />
          <ChipGroup
            label="How you felt"
            options={WELLBEING_OPTIONS as readonly string[]}
            value={form['wellbeing']!}
            onSelect={(v) => setForm((f) => ({ ...f, wellbeing: f['wellbeing'] === v ? "" : v }))}
          />
        </section>

        <section className="surface space-y-4 p-6">
          <h2 className="font-medium">Symptoms</h2>
          <div className="flex flex-wrap gap-2">
            {COMMON_SYMPTOMS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
                  symptoms.includes(s) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          {symptoms.length > 0 && <Badge variant="secondary">{symptoms.length} selected</Badge>}
        </section>

        <section className="surface space-y-4 p-6">
          <h2 className="font-medium">Readings (optional)</h2>
          <p className="text-sm text-muted-foreground">
            Only enter values you actually measured. These are recorded as your readings, never interpreted as a diagnosis.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="systolicBP" label="Systolic BP" value={form['systolicBP']!} onChange={set("systolicBP")} error={errors['systolicBP']} type="number" />
            <Field id="diastolicBP" label="Diastolic BP" value={form['diastolicBP']!} onChange={set("diastolicBP")} error={errors['diastolicBP']} type="number" />
            <Field id="bloodGlucose" label="Blood glucose (mg/dL)" value={form['bloodGlucose']!} onChange={set("bloodGlucose")} error={errors['bloodGlucose']} type="number" />
          </div>
        </section>

        <section className="surface space-y-2 p-6">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} value={form['notes']!} onChange={set("notes")} placeholder="Anything else worth remembering about today." />
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={busy || !uid}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />} Save check-in
          </Button>
        </div>
      </form>

      <Disclaimer />
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string | undefined;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={onChange} {...rest} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onSelect(o)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
              value === o ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {o.replace(/_/g, " ")}
          </button>
        ))}
      </div>
    </div>
  );
}
