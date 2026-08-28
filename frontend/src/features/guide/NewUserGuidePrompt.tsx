import { Compass, Heart, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface NewUserGuidePromptProps {
  onStartTour: () => void;
}

export function NewUserGuidePrompt({ onStartTour }: NewUserGuidePromptProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const hasCompleted = localStorage.getItem("hasCompletedGuide");
      if (!hasCompleted) {
        setVisible(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem("hasCompletedGuide", "dismissed");
    } catch {
      // ignore
    }
  };

  const handleStart = () => {
    setVisible(false);
    onStartTour();
  };

  if (!visible) return null;

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
      <Card className="relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-card p-0 shadow-sm">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss guide prompt"
        >
          <X className="size-4" />
        </button>

        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex items-start gap-3.5 pr-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
              <Heart className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  New to HealthGuardian AI?
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Sparkles className="size-2.5" /> 2-min tour
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Take a quick guided walkthrough to learn how daily check-ins, adaptive baseline
                analysis, and your private AI assistant work together.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground h-8"
            >
              Skip for now
            </Button>
            <Button
              size="sm"
              onClick={handleStart}
              className="text-xs gap-1.5 h-8 font-semibold shadow-xs"
            >
              <Compass className="size-3.5" />
              <span>Start guided tour</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
