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
import { useTranslation } from "@/locales/i18n";

export function DataFlowDiagram() {
  const { t } = useTranslation();

  return (
    <Card className="border-primary/20 bg-card/60 backdrop-blur">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("guide.diagram.dataFlow.systemArchitecture")}
          </span>
          <Badge variant="outline" className="text-xs font-normal">
            {t("guide.diagram.dataFlow.noInventions")}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Step 1 */}
          <div className="flex flex-1 items-center gap-3 rounded-lg border bg-background/80 p-3 shadow-xs">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold">{t("guide.diagram.dataFlow.step1Title")}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("guide.diagram.dataFlow.step1Desc")}
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
              <p className="text-xs font-semibold">{t("guide.diagram.dataFlow.step2Title")}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("guide.diagram.dataFlow.step2Desc")}
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
              <p className="text-xs font-semibold">{t("guide.diagram.dataFlow.step3Title")}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("guide.diagram.dataFlow.step3Desc")}
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
              <p className="text-xs font-semibold">{t("guide.diagram.dataFlow.step4Title")}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("guide.diagram.dataFlow.step4Desc")}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ThreeLayerRiskDiagram() {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <ShieldAlert className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">
            {t("guide.diagram.risk.layer1Badge")}
          </span>
        </div>
        <p className="text-xs font-medium text-foreground">
          {t("guide.diagram.risk.layer1Title")}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("guide.diagram.risk.layer1Desc")}
        </p>
      </div>

      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-warning">
          <Database className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">
            {t("guide.diagram.risk.layer2Badge")}
          </span>
        </div>
        <p className="text-xs font-medium text-foreground">
          {t("guide.diagram.risk.layer2Title")}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("guide.diagram.risk.layer2Desc")}
        </p>
      </div>

      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-primary">
          <Sparkles className="size-4 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">
            {t("guide.diagram.risk.layer3Badge")}
          </span>
        </div>
        <p className="text-xs font-medium text-foreground">
          {t("guide.diagram.risk.layer3Title")}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t("guide.diagram.risk.layer3Desc")}
        </p>
      </div>
    </div>
  );
}

export function AgenticDecisionDiagram() {
  const { t } = useTranslation();

  return (
    <Card className="border border-muted bg-card/60">
      <CardContent className="p-4 sm:p-6">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("guide.diagram.agent.title")}
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 rounded-md bg-background p-2.5 border">
            <span className="font-semibold text-primary">{t("guide.diagram.agent.userQuestionLabel")}</span>
            <span className="text-muted-foreground italic">
              {t("guide.diagram.agent.sampleQuestion")}
            </span>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="size-4 text-muted-foreground" />
          </div>

          <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p className="font-semibold text-foreground">{t("guide.diagram.agent.step1Title")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("guide.diagram.agent.step1Desc")}
            </p>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="size-4 text-muted-foreground" />
          </div>

          <div className="rounded-md border bg-background p-3">
            <p className="font-semibold text-foreground">{t("guide.diagram.agent.step2Title")}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("guide.diagram.agent.step2Desc")}
            </p>
          </div>

          <div className="flex items-center justify-center">
            <ArrowDown className="size-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              <strong>{t("guide.diagram.agent.writeProtectionLabel")}</strong>{" "}
              {t("guide.diagram.agent.writeProtectionDesc")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
