import { HelpCircle, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ContextualHelpProps {
  content: string;
  className?: string;
  variant?: "icon" | "badge" | "subtle";
  label?: string;
}

export function ContextualHelp({
  content,
  className,
  variant = "icon",
  label,
}: ContextualHelpProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm",
              variant === "badge" &&
                "rounded-full bg-secondary/80 px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary",
              variant === "subtle" && "text-xs hover:underline",
              className,
            )}
            aria-label={label || "Contextual help"}
          >
            {variant === "badge" ? (
              <>
                <Info className="size-3 shrink-0" />
                <span>{label || "Help"}</span>
              </>
            ) : (
              <>
                <HelpCircle className="size-3.5 shrink-0" />
                {label && <span className="text-xs font-normal">{label}</span>}
              </>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs text-xs leading-relaxed shadow-md"
        >
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
