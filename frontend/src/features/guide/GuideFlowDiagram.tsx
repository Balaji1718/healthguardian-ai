import {
  ArrowDown,
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export function DataFlowDiagram() {
  return (
    <Card className="border-primary/20 bg-card/60 backdrop-blur">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            System Data Flow Architecture
          </span>
          <Badge variant="outline" className="text-xs font-normal">
            No Missing Data Inventions
          </Badge>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Step 1 */}
          <div className="flex flex-1 items-center gap-3 rounded-lg border bg-background/80 p-3 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold">1. User Check-In</p>
              <p className="text-[11px] text-muted-foreground">
                Sleep, water, exercise, symptoms & vitals
              </p>
            </div>
          </div>

          <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground md:block" />
          <ArrowDown className="size-4 self-center text-muted-foreground md:hidden" />

          {/* Step 2 */}
          <div className="flex flex-1 items-center gap-3 rounded-lg border bg-background/80 p-3 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Database className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold">2. Local Storage</p>
              <p className="text-[11px] text-muted-foreground">
                Private Firestore & IndexedDB records
              </p>
            </div>
          </div>

          <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground md:block" />
          <ArrowDown className="size-4 self-center text-muted-foreground md:hidden" />

          {/* Step 3 */}
          <div className="flex flex-1 items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold">3. Adaptive Engine</p>
              <p className="text-[11px] text-muted-foreground">
                Calculates median baseline & trends
              </p>
            </div>
          </div>

          <ArrowRight className="hidden size-4 shrink-0 text-muted-foreground md:block" />
          <ArrowDown className="size-4 self-center text-muted-foreground md:hidden" />

          {/* Step 4 */}
          <div className="flex flex-1 items-center gap-3 rounded-lg border bg-background/80 p-3 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Bot className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold">4. Grounded AI</p>
              <p className="text-[11px] text-muted-foreground">
                Explains trends using verified data only
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ThreeLayerRiskDiagram() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <ShieldAlert className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">Layer 1: Safety Gate</span>
        </div>
        <p className="text-xs font-medium text-foreground">Immediate Emergency Screening</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Deterministic local filter for critical symptoms (chest pain, fainting). Immediately
          suggests urgent emergency care.
        </p>
      </div>

      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-warning">
          <Database className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">
            Layer 2: Clinical Vitals
          </span>
        </div>
        <p className="text-xs font-medium text-foreground">Standard Medical Thresholds</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Evidence-based reference ranges for measured blood pressure and blood glucose to highlight
          elevated readings.
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Sparkles className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">
            Layer 3: Wellness Baseline
          </span>
        </div>
        <p className="text-xs font-medium text-foreground">Personal Adaptive Intelligence</p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          Compares recent 3-day habits against your historical median (sleep, hydration, activity).
          Adapts to your individual normal.
        </p>
      </div>
    </div>
  );
}

export function AgenticDecisionDiagram() {
  return (
    <Card className="border border-muted bg-card/60">
      <CardContent className="p-4 sm:p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Agentic AI: Controlled & Grounded Decision Flow
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 rounded-md bg-background p-2.5 border">
            <span className="font-semibold text-primary">User Question:</span>
            <span className="text-muted-foreground italic">
              "Do I already have a hydration goal?"
            </span>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="size-4 text-muted-foreground" />
          </div>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-foreground">1. Dynamic Tool Selection</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              The AI selects <code className="text-primary font-mono text-[11px]">getGoals()</code>{" "}
              specifically—skipping unnecessary medical or risk tools.
            </p>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="size-4 text-muted-foreground" />
          </div>

          <div className="rounded-md border bg-background p-3">
            <p className="font-semibold text-foreground">2. Result Inspection & Verification</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Agent inspects the returned goal list. If sufficient, it generates the final answer
              immediately without redundant loops.
            </p>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="size-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>Write Protection:</strong> Any action that modifies data (e.g. creating a
              goal) triggers an explicit user confirmation prompt.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
