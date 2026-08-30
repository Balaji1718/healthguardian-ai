import { useState } from "react";
import { ChevronDown, ExternalLink, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/locales/i18n";
import type { WebSource } from "./agent";

interface SourceCardListProps {
  sources: WebSource[];
}

/**
 * Compact, modern source citation list inspired by Claude / Perplexity interfaces.
 * Displays a collapsed summary pill that expands into clean source cards.
 */
export function SourceCardList({ sources }: SourceCardListProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3.5 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors cursor-pointer"
          aria-expanded={open}
        >
          <Globe className="size-3.5 text-primary" />
          <span>
            {t("assistant.webSearchUsedPill", { count: sources.length }) || `Web search used · ${sources.length} sources`}
          </span>
          <ChevronDown
            className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          {t("assistant.publicReferenceData")}
        </span>
      </div>

      {open && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {sources.map((src, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded-xl border bg-card/60 p-3 text-xs shadow-xs hover:border-primary/40 hover:bg-card transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 font-medium bg-muted text-muted-foreground uppercase tracking-wider truncate max-w-[120px]"
                  >
                    {src.domain}
                  </Badge>
                  {src.publishedAt && (
                    <span className="text-[10px] text-muted-foreground">{src.publishedAt}</span>
                  )}
                </div>
                <h5 className="font-medium text-foreground line-clamp-2 pt-0.5 leading-snug">
                  {src.title}
                </h5>
                {src.snippet && (
                  <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                    {src.snippet}
                  </p>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-end">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  {t("assistant.openSource")} <ExternalLink className="size-2.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
