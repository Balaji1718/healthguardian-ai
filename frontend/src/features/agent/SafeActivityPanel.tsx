import { useState } from "react";
import { Activity, ChevronDown, CheckCircle2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/locales/i18n";
import type { AgentOutcome } from "./agent";

interface SafeActivityPanelProps {
  outcome: AgentOutcome;
}

/**
 * Compact safe activity transparency drawer.
 * Default: Collapsed.
 * Only displays safe high-level metadata (tools used, completion status).
 * Never exposes raw prompts, internal chain-of-thought, secret API keys, or raw JSON.
 */
export function SafeActivityPanel({ outcome }: SafeActivityPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const safeMeta = outcome.safeActivity || {
    toolCount: outcome.usedTools.length,
    searchUsed: Boolean(outcome.webSearchUsed),
    sourcesCount: outcome.sources?.length || 0,
    status: outcome.aiAvailable ? "completed" : "offline_reasoning",
    toolsUsed: outcome.usedTools.map((t) => t.name),
  };

  if (outcome.usedTools.length === 0 && !outcome.webSearchUsed) {
    return null;
  }

  return (
    <div className="mt-2.5 pt-2 border-t border-border/40">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-0.5"
        aria-expanded={open}
      >
        <Activity className="size-3" />
        <span>{t("assistant.activitySteps", { count: safeMeta.toolCount }) || `Activity (${safeMeta.toolCount} steps)`}</span>
        <ChevronDown
          className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-2 space-y-2 rounded-xl bg-muted/40 p-3 text-xs border">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground border-b pb-1.5">
            <span className="flex items-center gap-1">
              <ShieldCheck className="size-3.5 text-primary" /> {t("assistant.verifiedSafeExecution")}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {safeMeta.status}
            </Badge>
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="text-[11px] text-muted-foreground">{t("assistant.authorizedOperations")}</p>
            <ul className="space-y-1">
              {outcome.usedTools.map((t, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded bg-background/80 px-2 py-1 text-[11px]"
                >
                  <span className="font-mono font-medium text-foreground">{t.name}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle2 className="size-3 text-success" /> {t.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
