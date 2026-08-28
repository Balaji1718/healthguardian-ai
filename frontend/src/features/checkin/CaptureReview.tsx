import { CheckCircle2, Edit3, Heart, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CheckinSource, DailyCheckin } from "@/models";

interface CaptureReviewProps {
  date: string;
  data: Partial<DailyCheckin>;
  source: CheckinSource;
  onEdit: () => void;
  onConfirm: () => Promise<void>;
  busy: boolean;
}

const WELLBEING_LABELS: Record<string, { label: string; icon: string }> = {
  great: { label: "Great", icon: "😊" },
  good: { label: "Good", icon: "🙂" },
  okay: { label: "Okay", icon: "😐" },
  tired: { label: "Tired", icon: "😴" },
  not_great: { label: "Not great", icon: "🙁" },
};

/**
 * Universal Review / Verification Gate.
 * Ensures the user explicitly verifies all captured/extracted health values before committing to storage.
 */
export function CaptureReview({ date, data, source, onEdit, onConfirm, busy }: CaptureReviewProps) {
  const wellbeingObj = data.wellbeing ? WELLBEING_LABELS[data.wellbeing] : undefined;

  const items = [
    {
      label: "Date",
      value: date,
      highlight: false,
    },
    {
      label: "How you feel",
      value: wellbeingObj
        ? `${wellbeingObj.icon} ${wellbeingObj.label}`
        : data.wellbeing || "Not specified",
      highlight: Boolean(data.wellbeing),
    },
    {
      label: "Sleep",
      value: data.sleepHours != null ? `${data.sleepHours} hours` : "Not logged",
      highlight: data.sleepHours != null,
    },
    {
      label: "Water",
      value: data.waterGlasses != null ? `${data.waterGlasses} glasses` : "Not logged",
      highlight: data.waterGlasses != null,
    },
    {
      label: "Exercise",
      value: data.exerciseMinutes != null ? `${data.exerciseMinutes} minutes` : "Not logged",
      highlight: data.exerciseMinutes != null,
    },
    ...(data.weightKg != null
      ? [{ label: "Weight", value: `${data.weightKg} kg`, highlight: true }]
      : []),
    ...(data.systolicBP != null && data.diastolicBP != null
      ? [
          {
            label: "Blood pressure",
            value: `${data.systolicBP}/${data.diastolicBP} mmHg`,
            highlight: true,
          },
        ]
      : []),
    ...(data.bloodGlucose != null
      ? [
          {
            label: "Blood glucose",
            value: `${data.bloodGlucose} ${data.bloodGlucoseUnit || "mg/dL"}`,
            highlight: true,
          },
        ]
      : []),
  ];

  return (
    <div className="surface p-6 space-y-6 max-w-xl mx-auto rounded-2xl shadow-xs border">
      <div className="flex items-start justify-between gap-3 border-b pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">Review today's check-in</h2>
            <Badge
              variant="outline"
              className="gap-1 text-[10px] text-primary border-primary/30 bg-primary/5"
            >
              <ShieldCheck className="size-3" /> Verification Gate
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Check the values before saving. Blank entries will stay missing and won't affect your
            baseline with fake zeroes.
          </p>
        </div>
      </div>

      {/* Structured Fields Summary */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl border text-xs transition-colors ${
              item.highlight
                ? "bg-card border-border"
                : "bg-muted/30 border-border/40 text-muted-foreground"
            }`}
          >
            <span className="text-[11px] text-muted-foreground block font-medium">
              {item.label}
            </span>
            <span
              className={`font-semibold mt-0.5 block ${item.highlight ? "text-foreground" : "text-muted-foreground/80 italic"}`}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>

      {/* Context Chips (if any) */}
      {data.tags && data.tags.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-semibold text-foreground">Context tags:</span>
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-medium px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Symptoms (if any) */}
      {data.symptoms && data.symptoms.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-xs font-semibold text-foreground">Logged symptoms:</span>
          <div className="flex flex-wrap gap-1.5">
            {data.symptoms.map((sym, i) => (
              <Badge
                key={i}
                variant="outline"
                className="text-xs capitalize text-destructive border-destructive/30 bg-destructive/5 px-2 py-0.5"
              >
                {sym.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes (if any) */}
      {data.notes && (
        <div className="space-y-1 rounded-xl bg-muted/40 p-3 text-xs">
          <span className="font-semibold text-foreground block">Notes:</span>
          <p className="text-muted-foreground leading-relaxed italic">{data.notes}</p>
        </div>
      )}

      {/* Provenance & Verification Metadata Banner */}
      <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Capture Source:{" "}
          <strong className="text-primary capitalize">{source.replace(/_/g, " ")}</strong>
        </span>
        <span className="flex items-center gap-1 font-medium text-success text-[11px]">
          <CheckCircle2 className="size-3" /> Ready for User Verification
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={busy}
          className="text-xs h-9 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Edit3 className="size-3.5" /> Edit values
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={() => void onConfirm()}
          disabled={busy}
          className="text-xs h-9 px-4 gap-1.5 font-medium shadow-xs"
        >
          {busy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3.5" /> Confirm & Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
