import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  Heart,
  HelpCircle,
  Keyboard,
  Loader2,
  Mic,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
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
import { ContextualHelp } from "@/features/guide/ContextualHelp";
import { CaptureReview } from "@/features/checkin/CaptureReview";
import { extractCheckinFromText } from "@/services/ai/conversational-checkin";
import type { CheckinSource, DailyCheckin } from "@/models";

export const Route = createFileRoute("/app/checkin")({
  component: Checkin,
  head: () => ({
    meta: [
      { title: "Daily Check-in — HealthGuardian AI" },
      {
        name: "description",
        content:
          "Fast 30-second quick check-in, conversational natural language log, or complete clinical record.",
      },
      { property: "og:title", content: "Daily Health Check-in" },
      {
        property: "og:description",
        content: "Log sleep, hydration, activity and symptoms with verified accuracy.",
      },
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

const QUICK_TAG_OPTIONS = [
  { label: "Traveling", icon: "✈️" },
  { label: "Busy day", icon: "💼" },
  { label: "Poor sleep", icon: "🥱" },
  { label: "More active", icon: "🏃" },
  { label: "Eating differently", icon: "🥗" },
  { label: "Mild symptoms", icon: "🤒" },
];

const WELLBEING_PILLS = [
  { value: "great", label: "Great", icon: "😊" },
  { value: "good", label: "Good", icon: "🙂" },
  { value: "okay", label: "Okay", icon: "😐" },
  { value: "tired", label: "Tired", icon: "😴" },
  { value: "not_great", label: "Not great", icon: "🙁" },
];

const CONVERSATIONAL_EXAMPLES = [
  "Today I slept 6 hours, drank 5 glasses of water, walked for 30 minutes and felt tired.",
  "Slept 7.5 hours, had 8 glasses of water, 45 minutes running, feeling great!",
  "Busy day traveling. Slept 5 hours, drank 4 glasses of water, feeling okay.",
];

function Checkin() {
  const uid = useUid();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useAppStore((s) => s.online);

  const [mode, setMode] = useState<"quick" | "detailed" | "conversational" | "hub" | "review">(
    "quick",
  );
  const [activeSource, setActiveSource] = useState<CheckinSource>("quick_checkin");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState<FormState>(EMPTY);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Conversational state
  const [conversationalInput, setConversationalInput] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [emergencyWarning, setEmergencyWarning] = useState<string | null>(null);
  const [ambiguityWarning, setAmbiguityWarning] = useState<string | null>(null);

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
        setSelectedTags([]);
        return;
      }
      setForm({
        ...EMPTY,
        sleepHours: existing.sleepHours != null ? existing.sleepHours.toString() : "",
        waterGlasses: existing.waterGlasses != null ? existing.waterGlasses.toString() : "",
        exerciseMinutes:
          existing.exerciseMinutes != null ? existing.exerciseMinutes.toString() : "",
        exerciseType: existing.exerciseType ?? "",
        foodQuality: existing.foodQuality ?? "",
        weightKg: existing.weightKg != null ? existing.weightKg.toString() : "",
        wellbeing: existing.wellbeing ?? "",
        systolicBP: existing.systolicBP != null ? existing.systolicBP.toString() : "",
        diastolicBP: existing.diastolicBP != null ? existing.diastolicBP.toString() : "",
        bloodGlucose: existing.bloodGlucose != null ? existing.bloodGlucose.toString() : "",
        bloodGlucoseUnit: existing.bloodGlucoseUnit ?? "mg/dL",
        notes: existing.notes ?? "",
      });
      setSymptoms(existing.symptoms ?? []);
      setSelectedTags(existing.tags ?? []);
      if (existing.source) {
        setActiveSource(existing.source);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uid, date]);

  const setField = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const adjustNumeric = (key: string, step: number, min = 0, max = 100) => {
    setForm((f) => {
      const current = f[key] === "" ? min : Number(f[key]);
      const next = Math.min(max, Math.max(min, current + step));
      return { ...f, [key]: String(next) };
    });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const toggleSymptom = (s: string) => {
    setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  };

  const getParsedData = (): Partial<DailyCheckin> => {
    const parsed = checkinSchema.safeParse({
      ...form,
      tags: selectedTags,
      source: activeSource,
      verificationStatus: "user_verified",
    });

    if (!parsed.success) return {};
    const d = parsed.data;

    return {
      sleepHours: d.sleepHours,
      waterGlasses: d.waterGlasses,
      exerciseMinutes: d.exerciseMinutes,
      exerciseType: form["exerciseType"] || undefined,
      foodQuality: form["foodQuality"] || undefined,
      weightKg: d.weightKg,
      wellbeing: form["wellbeing"] || undefined,
      systolicBP: d.systolicBP,
      diastolicBP: d.diastolicBP,
      bloodGlucose: d.bloodGlucose,
      bloodGlucoseUnit: d.bloodGlucose != null ? form["bloodGlucoseUnit"] : undefined,
      notes: form["notes"] || undefined,
      symptoms,
      tags: selectedTags,
      source: activeSource,
      verificationStatus: "user_verified",
    };
  };

  const validateAndGetParsedData = (): Partial<DailyCheckin> | null => {
    const parsed = checkinSchema.safeParse({
      ...form,
      tags: selectedTags,
      source: activeSource,
      verificationStatus: "user_verified",
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      toast.error("Please correct the highlighted values.");
      return null;
    }

    setErrors({});
    const d = parsed.data;

    if ((d.systolicBP == null) !== (d.diastolicBP == null)) {
      setErrors({ systolicBP: "Enter both blood pressure numbers, or leave both blank." });
      toast.error("Enter both blood pressure numbers, or leave both blank.");
      return null;
    }

    return {
      sleepHours: d.sleepHours,
      waterGlasses: d.waterGlasses,
      exerciseMinutes: d.exerciseMinutes,
      exerciseType: form["exerciseType"] || undefined,
      foodQuality: form["foodQuality"] || undefined,
      weightKg: d.weightKg,
      wellbeing: form["wellbeing"] || undefined,
      systolicBP: d.systolicBP,
      diastolicBP: d.diastolicBP,
      bloodGlucose: d.bloodGlucose,
      bloodGlucoseUnit: d.bloodGlucose != null ? form["bloodGlucoseUnit"] : undefined,
      notes: form["notes"] || undefined,
      symptoms,
      tags: selectedTags,
      source: activeSource,
      verificationStatus: "user_verified",
    };
  };

  const handleProceedToReview = (src: CheckinSource) => {
    setActiveSource(src);
    const data = validateAndGetParsedData();
    if (data) {
      setMode("review");
    }
  };

  const handleConversationalExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = conversationalInput.trim();
    if (!text) {
      toast.error("Please describe today's check-in first.");
      return;
    }

    setExtracting(true);
    setEmergencyWarning(null);
    setAmbiguityWarning(null);

    try {
      const res = await extractCheckinFromText(text);

      if (res.emergency) {
        setEmergencyWarning(res.emergencyMessage || "Urgent medical attention recommended.");
        toast.error("Immediate medical attention recommended. Check emergency instructions.");
        return;
      }

      if (!res.ok || !res.data) {
        toast.error(
          res.error ||
            "I couldn't understand that check-in clearly. You can edit the text or use Quick Check-in.",
        );
        return;
      }

      const extracted = res.data;

      // Populate form state with extracted values (missing remain empty string)
      setForm({
        ...EMPTY,
        sleepHours: extracted.sleepHours != null ? extracted.sleepHours.toString() : "",
        waterGlasses: extracted.waterGlasses != null ? extracted.waterGlasses.toString() : "",
        exerciseMinutes:
          extracted.exerciseMinutes != null ? extracted.exerciseMinutes.toString() : "",
        exerciseType: extracted.exerciseType ?? "",
        foodQuality: extracted.foodQuality ?? "",
        weightKg: extracted.weightKg != null ? extracted.weightKg.toString() : "",
        wellbeing: extracted.wellbeing ?? "",
        systolicBP: extracted.systolicBP != null ? extracted.systolicBP.toString() : "",
        diastolicBP: extracted.diastolicBP != null ? extracted.diastolicBP.toString() : "",
        bloodGlucose: extracted.bloodGlucose != null ? extracted.bloodGlucose.toString() : "",
        bloodGlucoseUnit: extracted.bloodGlucoseUnit ?? "mg/dL",
        notes: extracted.notes ?? text,
      });

      if (extracted.tags && Array.isArray(extracted.tags)) {
        setSelectedTags(extracted.tags);
      }
      if (extracted.symptoms && Array.isArray(extracted.symptoms)) {
        setSymptoms(extracted.symptoms);
      }
      if (extracted.date) {
        setDate(extracted.date);
      }

      if (extracted.isAmbiguous && extracted.ambiguityReason) {
        setAmbiguityWarning(extracted.ambiguityReason);
      }

      setActiveSource("conversational");
      setMode("review");
      toast.success("Check-in extracted. Please review and confirm your values.");
    } catch {
      toast.error("Extraction error. You can use Quick Check-in instead.");
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!uid || busy) return;
    const data = validateAndGetParsedData();
    if (!data) return;

    setBusy(true);
    try {
      await saveCheckin(uid, new Date(`${date}T00:00:00`), data);
      await qc.invalidateQueries({ queryKey: ["checkins"] });
      toast.success(
        online
          ? "Today's check-in was saved."
          : "Saved locally — it will sync when you are back online.",
      );
      await navigate({ to: "/app/dashboard" });
    } catch {
      toast.error("Could not save your check-in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {!online && <OfflineNotice />}

      {/* Top Header & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <PageHeader
          title={
            mode === "hub"
              ? "Daily Capture Hub"
              : mode === "quick"
                ? "Quick Check-in"
                : mode === "conversational"
                  ? "Conversational Check-in"
                  : mode === "detailed"
                    ? "Detailed Check-in"
                    : "Review Check-in"
          }
          description={
            mode === "quick"
              ? "Log your mood, sleep, hydration, and activity in about 30 seconds."
              : mode === "conversational"
                ? "Describe your day naturally. Values are extracted and verified by you before saving."
                : mode === "detailed"
                  ? "Complete clinical log for vitals, glucose, blood pressure, weight, and symptoms."
                  : "Choose how you'd like to capture your health records today."
          }
        />

        {mode !== "review" && (
          <div className="flex items-center gap-1 rounded-xl border bg-muted/40 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setActiveSource("quick_checkin");
                setMode("quick");
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer",
                mode === "quick"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Zap className="size-3.5 text-primary" /> Quick
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSource("conversational");
                setMode("conversational");
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer",
                mode === "conversational"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sparkles className="size-3.5 text-primary" /> Conversational
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSource("manual");
                setMode("detailed");
              }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer",
                mode === "detailed"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <FileText className="size-3.5" /> Detailed
            </button>

            <button
              type="button"
              onClick={() => setMode("hub")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all cursor-pointer",
                mode === "hub"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Hub
            </button>
          </div>
        )}
      </div>

      {/* 1. DAILY CAPTURE HUB OVERVIEW */}
      {mode === "hub" && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              How would you like to log today?
            </h2>
            <p className="text-xs text-muted-foreground">
              Select the interaction style that best matches your routine right now.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Card 1: Quick Check-in (ACTIVE) */}
            <button
              type="button"
              onClick={() => {
                setActiveSource("quick_checkin");
                setMode("quick");
              }}
              className="flex flex-col justify-between rounded-2xl border bg-card p-5 text-left shadow-xs hover:border-primary transition-all cursor-pointer group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Zap className="size-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-primary border-primary/30 bg-primary/5"
                  >
                    Recommended · ~30s
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  Quick Check-in
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Log mood, sleep, water, and exercise in about 30 seconds. Leave unknown values
                  blank.
                </p>
              </div>
              <div className="pt-4 text-xs font-medium text-primary flex items-center gap-1">
                Start Quick Check-in →
              </div>
            </button>

            {/* Card 2: Type Naturally (ACTIVE - Phase 10B) */}
            <button
              type="button"
              onClick={() => {
                setActiveSource("conversational");
                setMode("conversational");
              }}
              className="flex flex-col justify-between rounded-2xl border bg-card p-5 text-left shadow-xs hover:border-primary transition-all cursor-pointer group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Keyboard className="size-5" />
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-primary border-primary/30 bg-primary/5"
                  >
                    <Sparkles className="size-2.5 mr-0.5" /> AI Extracted
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  Type naturally
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Describe today's sleep, hydration, exercise, and mood in a sentence. Values are
                  verified by you before saving.
                </p>
              </div>
              <div className="pt-4 text-xs font-medium text-primary flex items-center gap-1">
                Type check-in naturally →
              </div>
            </button>

            {/* Card 3: Detailed Check-in (ACTIVE) */}
            <button
              type="button"
              onClick={() => {
                setActiveSource("manual");
                setMode("detailed");
              }}
              className="flex flex-col justify-between rounded-2xl border bg-card p-5 text-left shadow-xs hover:border-primary transition-all cursor-pointer group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-muted text-foreground flex items-center justify-center">
                    <FileText className="size-5" />
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    Complete form
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                  Detailed Check-in
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Full clinical entry including blood pressure, glucose, weight, symptoms, and
                  clinical notes.
                </p>
              </div>
              <div className="pt-4 text-xs font-medium text-primary flex items-center gap-1">
                Open Detailed Form →
              </div>
            </button>

            {/* Card 4: Speak (COMING SOON) */}
            <div className="flex flex-col justify-between rounded-2xl border bg-muted/30 p-5 opacity-75">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center">
                    <Mic className="size-5" />
                  </div>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    Coming soon
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm text-muted-foreground">Speak</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Dictate your daily health habits naturally. Automatic transcription and
                  verification will be enabled in a future release.
                </p>
              </div>
              <div className="pt-4 text-[11px] text-muted-foreground italic">
                Voice recognition in development
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONVERSATIONAL CHECK-IN VIEW (PHASE 10B) */}
      {mode === "conversational" && (
        <div className="space-y-5 max-w-xl mx-auto">
          {/* Emergency Safety Alert (if acute symptoms detected) */}
          {emergencyWarning && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle className="size-4 shrink-0" /> Immediate Medical Safety Notice
              </div>
              <p className="text-destructive leading-relaxed">{emergencyWarning}</p>
            </div>
          )}

          {/* Ambiguity Warning Banner (if ambiguous values detected) */}
          {ambiguityWarning && (
            <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 space-y-1.5 text-xs text-warning-foreground">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="size-4 shrink-0" /> Ambiguity Detected
              </div>
              <p className="leading-relaxed">{ambiguityWarning}</p>
            </div>
          )}

          <form onSubmit={handleConversationalExtract} className="space-y-4">
            <div className="surface p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="conversational-textarea"
                  className="text-xs font-semibold text-foreground"
                >
                  Type your check-in naturally
                </Label>
                <Badge
                  variant="outline"
                  className="text-[10px] text-primary border-primary/30 bg-primary/5 gap-1"
                >
                  <Sparkles className="size-2.5" /> Bounded Extractor
                </Badge>
              </div>

              <Textarea
                id="conversational-textarea"
                rows={4}
                placeholder="Today I slept 6 hours, drank 5 glasses of water, walked for 30 minutes and felt tired."
                value={conversationalInput}
                onChange={(e) => setConversationalInput(e.target.value)}
                disabled={extracting}
                className="text-sm leading-relaxed"
              />

              {/* Sample Prompt Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground block">Example phrases:</span>
                <div className="space-y-1">
                  {CONVERSATIONAL_EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setConversationalInput(ex)}
                      className="text-[11px] text-left text-primary/80 hover:text-primary hover:underline block truncate w-full cursor-pointer"
                    >
                      • "{ex}"
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Row */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveSource("quick_checkin");
                  setMode("quick");
                }}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                ← Use Quick Check-in instead
              </button>

              <Button
                type="submit"
                disabled={extracting || !conversationalInput.trim()}
                className="gap-1.5 font-semibold shadow-xs"
              >
                {extracting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Extracting check-in…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" /> Extract check-in
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 3. QUICK CHECK-IN VIEW (DEFAULT LOW-FRICTION PATH) */}
      {mode === "quick" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProceedToReview(
              activeSource === "conversational" ? "conversational" : "quick_checkin",
            );
          }}
          className="space-y-5 max-w-xl mx-auto"
        >
          {/* Date Row */}
          <div className="surface p-4 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <Label htmlFor="quick-date" className="text-xs font-semibold text-foreground">
                Check-in Date
              </Label>
              <p className="text-[11px] text-muted-foreground">Defaults to today</p>
            </div>
            <Input
              id="quick-date"
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto text-xs h-8"
            />
          </div>

          {/* How are you feeling? */}
          <div className="surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                How are you feeling today?
              </Label>
              <ContextualHelp content="Your overall perceived wellbeing helps contextualize daily recovery and symptom trends." />
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {WELLBEING_PILLS.map((pill) => {
                const active = form.wellbeing === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setField("wellbeing", pill.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer",
                      active
                        ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                        : "bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="text-xl sm:text-2xl">{pill.icon}</span>
                    <span className="text-[11px] mt-1">{pill.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Core Lifestyle Steppers */}
          <div className="surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">Core Lifestyle Metrics</h3>
              <span className="text-[11px] text-muted-foreground">Leave blank if unknown</span>
            </div>

            {/* Sleep Stepper */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border">
              <div>
                <Label
                  htmlFor="quick-sleep"
                  className="text-xs font-semibold text-foreground block"
                >
                  Sleep Duration
                </Label>
                <span className="text-[11px] text-muted-foreground">Hours of rest last night</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7 rounded-lg"
                  onClick={() => adjustNumeric("sleepHours", -0.5, 0, 24)}
                  aria-label="Decrease sleep hours"
                >
                  <Minus className="size-3" />
                </Button>
                <Input
                  id="quick-sleep"
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="—"
                  value={form.sleepHours}
                  onChange={(e) => setField("sleepHours", e.target.value)}
                  className="w-14 text-center text-xs h-7 font-semibold"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7 rounded-lg"
                  onClick={() => adjustNumeric("sleepHours", 0.5, 0, 24)}
                  aria-label="Increase sleep hours"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
            {errors["sleepHours"] && (
              <p className="text-xs text-destructive">{errors["sleepHours"]}</p>
            )}

            {/* Water Stepper */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border">
              <div>
                <Label
                  htmlFor="quick-water"
                  className="text-xs font-semibold text-foreground block"
                >
                  Water Intake
                </Label>
                <span className="text-[11px] text-muted-foreground">Glasses (~250ml each)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7 rounded-lg"
                  onClick={() => adjustNumeric("waterGlasses", -1, 0, 30)}
                  aria-label="Decrease water glasses"
                >
                  <Minus className="size-3" />
                </Button>
                <Input
                  id="quick-water"
                  type="number"
                  min="0"
                  max="30"
                  placeholder="—"
                  value={form.waterGlasses}
                  onChange={(e) => setField("waterGlasses", e.target.value)}
                  className="w-14 text-center text-xs h-7 font-semibold"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7 rounded-lg"
                  onClick={() => adjustNumeric("waterGlasses", 1, 0, 30)}
                  aria-label="Increase water glasses"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
            {errors["waterGlasses"] && (
              <p className="text-xs text-destructive">{errors["waterGlasses"]}</p>
            )}

            {/* Exercise Stepper */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/20 border">
              <div>
                <Label
                  htmlFor="quick-exercise"
                  className="text-xs font-semibold text-foreground block"
                >
                  Physical Activity
                </Label>
                <span className="text-[11px] text-muted-foreground">Total active minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7 rounded-lg"
                  onClick={() => adjustNumeric("exerciseMinutes", -5, 0, 600)}
                  aria-label="Decrease exercise minutes"
                >
                  <Minus className="size-3" />
                </Button>
                <Input
                  id="quick-exercise"
                  type="number"
                  min="0"
                  max="600"
                  step="5"
                  placeholder="—"
                  value={form.exerciseMinutes}
                  onChange={(e) => setField("exerciseMinutes", e.target.value)}
                  className="w-14 text-center text-xs h-7 font-semibold"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-7 rounded-lg"
                  onClick={() => adjustNumeric("exerciseMinutes", 5, 0, 600)}
                  aria-label="Increase exercise minutes"
                >
                  <Plus className="size-3" />
                </Button>
              </div>
            </div>
            {errors["exerciseMinutes"] && (
              <p className="text-xs text-destructive">{errors["exerciseMinutes"]}</p>
            )}
          </div>

          {/* Anything different today? Context Chips */}
          <div className="surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground">
                Anything different today? (Optional)
              </Label>
              <span className="text-[11px] text-muted-foreground">Context tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAG_OPTIONS.map((tag) => {
                const active = selectedTags.includes(tag.label);
                return (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => toggleTag(tag.label)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-xs"
                        : "bg-card border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span>{tag.icon}</span>
                    <span>{tag.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveSource("manual");
                setMode("detailed");
              }}
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              Need to enter BP, glucose or weight? Switch to Detailed Form →
            </button>

            <Button type="submit" className="gap-1.5 shadow-xs font-semibold">
              <ShieldCheck className="size-4" /> Review & Save
            </Button>
          </div>
        </form>
      )}

      {/* 4. UNIVERSAL VERIFICATION REVIEW GATE */}
      {mode === "review" && (
        <CaptureReview
          date={date}
          data={getParsedData()}
          source={activeSource}
          onEdit={() => {
            if (activeSource === "detailed") setMode("detailed");
            else setMode("quick");
          }}
          onConfirm={handleConfirmSave}
          busy={busy}
        />
      )}

      {/* 5. DETAILED CHECK-IN FORM (COMPREHENSIVE) */}
      {mode === "detailed" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProceedToReview("manual");
          }}
          className="space-y-4"
          noValidate
        >
          {/* Date Picker */}
          <section className="surface space-y-4 p-6">
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="detailed-date">Date</Label>
              <Input
                id="detailed-date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </section>

          {/* Lifestyle */}
          <section className="surface space-y-4 p-6">
            <div className="flex items-center gap-2">
              <h2 className="font-medium">Lifestyle</h2>
              <ContextualHelp content="Leave unknown values blank. Blank entries remain missing and are never treated as zero." />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="det-sleep">Sleep (hours)</Label>
                <Input
                  id="det-sleep"
                  type="number"
                  step="0.1"
                  min="0"
                  max="24"
                  value={form.sleepHours}
                  onChange={(e) => setField("sleepHours", e.target.value)}
                />
                {errors["sleepHours"] && (
                  <p className="text-xs text-destructive">{errors["sleepHours"]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det-water">Water (glasses)</Label>
                <Input
                  id="det-water"
                  type="number"
                  min="0"
                  max="30"
                  value={form.waterGlasses}
                  onChange={(e) => setField("waterGlasses", e.target.value)}
                />
                {errors["waterGlasses"] && (
                  <p className="text-xs text-destructive">{errors["waterGlasses"]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det-exercise">Exercise (minutes)</Label>
                <Input
                  id="det-exercise"
                  type="number"
                  min="0"
                  max="600"
                  value={form.exerciseMinutes}
                  onChange={(e) => setField("exerciseMinutes", e.target.value)}
                />
                {errors["exerciseMinutes"] && (
                  <p className="text-xs text-destructive">{errors["exerciseMinutes"]}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="exerciseType">Exercise type</Label>
                <Input
                  id="exerciseType"
                  placeholder="e.g. Walking, Swimming, Strength"
                  value={form.exerciseType}
                  onChange={(e) => setField("exerciseType", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="foodQuality">Food quality</Label>
                <select
                  id="foodQuality"
                  value={form.foodQuality}
                  onChange={(e) => setField("foodQuality", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">(Not logged)</option>
                  {FOOD_QUALITY_OPTIONS.map((f) => (
                    <option key={f} value={f}>
                      {f.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Wellbeing & Context */}
          <section className="surface space-y-4 p-6">
            <h2 className="font-medium">Wellbeing & Context</h2>
            <div className="space-y-1.5">
              <Label htmlFor="wellbeing">Overall wellbeing</Label>
              <select
                id="wellbeing"
                value={form.wellbeing}
                onChange={(e) => setField("wellbeing", e.target.value)}
                className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">(Not logged)</option>
                {WELLBEING_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {/* Symptoms */}
          <section className="surface space-y-4 p-6">
            <h2 className="font-medium">Symptoms</h2>
            <p className="text-xs text-muted-foreground">Select any symptoms experienced today.</p>
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((s) => {
                const active = symptoms.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs capitalize transition-colors cursor-pointer",
                      active
                        ? "border-destructive bg-destructive/10 text-destructive font-medium"
                        : "hover:bg-muted text-muted-foreground",
                    )}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Vitals & Lab Readings */}
          <section className="surface space-y-4 p-6">
            <h2 className="font-medium">Vitals & Readings</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="weightKg">Weight (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  value={form.weightKg}
                  onChange={(e) => setField("weightKg", e.target.value)}
                />
                {errors["weightKg"] && (
                  <p className="text-xs text-destructive">{errors["weightKg"]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="systolicBP">Systolic BP (mmHg)</Label>
                <Input
                  id="systolicBP"
                  type="number"
                  min="60"
                  max="260"
                  placeholder="e.g. 120"
                  value={form.systolicBP}
                  onChange={(e) => setField("systolicBP", e.target.value)}
                />
                {errors["systolicBP"] && (
                  <p className="text-xs text-destructive">{errors["systolicBP"]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="diastolicBP">Diastolic BP (mmHg)</Label>
                <Input
                  id="diastolicBP"
                  type="number"
                  min="30"
                  max="200"
                  placeholder="e.g. 80"
                  value={form.diastolicBP}
                  onChange={(e) => setField("diastolicBP", e.target.value)}
                />
                {errors["diastolicBP"] && (
                  <p className="text-xs text-destructive">{errors["diastolicBP"]}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="bloodGlucose">Blood glucose</Label>
                <Input
                  id="bloodGlucose"
                  type="number"
                  step="0.1"
                  min="1"
                  max="900"
                  value={form.bloodGlucose}
                  onChange={(e) => setField("bloodGlucose", e.target.value)}
                />
                {errors["bloodGlucose"] && (
                  <p className="text-xs text-destructive">{errors["bloodGlucose"]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bloodGlucoseUnit">Glucose unit</Label>
                <select
                  id="bloodGlucoseUnit"
                  value={form.bloodGlucoseUnit}
                  onChange={(e) => setField("bloodGlucoseUnit", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="mg/dL">mg/dL</option>
                  <option value="mmol/L">mmol/L</option>
                </select>
              </div>
            </div>
          </section>

          {/* Notes */}
          <section className="surface space-y-4 p-6">
            <h2 className="font-medium">Notes</h2>
            <Textarea
              id="notes"
              rows={3}
              placeholder="Any additional context about your day…"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
          </section>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setActiveSource("quick_checkin");
                setMode("quick");
              }}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ← Back to Quick Check-in
            </button>

            <Button type="submit" className="gap-1.5 font-semibold shadow-xs">
              <ShieldCheck className="size-4" /> Review & Save
            </Button>
          </div>
        </form>
      )}

      <Disclaimer />
    </div>
  );
}
