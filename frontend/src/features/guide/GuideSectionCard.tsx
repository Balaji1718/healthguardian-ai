import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Info,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { GuideSection } from "./types";

interface GuideSectionCardProps {
  section: GuideSection;
  onOpenTourStep?: (sectionId: string) => void;
}

export function GuideSectionCard({ section }: GuideSectionCardProps) {
  const [tab, setTab] = useState<string>("beginner");

  return (
    <Card
      className="overflow-hidden border transition-all hover:border-primary/40 hover:shadow-xs"
      id={section.id}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="font-mono text-xs font-semibold px-2.5 py-0.5 bg-primary/5 text-primary border-primary/20"
            >
              Section {section.number}
            </Badge>
            <Badge variant="secondary" className="text-[11px] capitalize">
              {section.category.replace("_", " ")}
            </Badge>
          </div>
          {section.routeToOpen && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              <Link to={section.routeToOpen}>
                <span>{section.buttonLabel || "Open feature"}</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
        <CardTitle className="text-lg sm:text-xl tracking-tight mt-1">{section.title}</CardTitle>
        <CardDescription className="text-xs sm:text-sm">{section.subtitle}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-1 pb-4">
        <p className="text-xs sm:text-sm leading-relaxed text-foreground/90 font-medium">
          {section.summary}
        </p>

        {/* Progressive Disclosure Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8 text-xs">
            <TabsTrigger value="beginner" className="text-xs">
              Beginner
            </TabsTrigger>
            <TabsTrigger value="learnMore" className="text-xs">
              Learn More
            </TabsTrigger>
            <TabsTrigger value="technical" className="text-xs">
              Technical Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beginner" className="mt-3 space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground border">
              <p>{section.beginnerExplanation}</p>
            </div>
          </TabsContent>

          <TabsContent value="learnMore" className="mt-3 space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground border">
              <p>{section.learnMoreExplanation || section.beginnerExplanation}</p>
            </div>
          </TabsContent>

          <TabsContent value="technical" className="mt-3 space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground border">
              <p>
                {section.technicalDetails ||
                  "This feature operates under verified local data-minimization architecture and authenticated Firebase UID bounds."}
              </p>
              {section.dataFlowDescription && (
                <div className="mt-2.5 pt-2 border-t text-[11px] font-mono text-primary">
                  Flow: {section.dataFlowDescription}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Key Points */}
        {section.keyPoints.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Key Takeaways:
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {section.keyPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="size-3.5 shrink-0 text-primary mt-0.5" />
                  <span className="leading-snug">{point}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Example Scenario if available */}
        {section.exampleScenario && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
              <Sparkles className="size-3.5 shrink-0" />
              <span>Real Example</span>
            </div>
            <p className="text-foreground/90 font-medium">{section.exampleScenario.scenario}</p>
            <p className="text-muted-foreground mt-0.5">
              <strong>Result:</strong> {section.exampleScenario.result}
            </p>
          </div>
        )}

        {/* What It Cannot Do */}
        {section.whatItCannotDo && section.whatItCannotDo.length > 0 && (
          <div className="rounded-lg border border-muted bg-card/40 p-3 text-xs space-y-1.5">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Info className="size-3.5 text-muted-foreground" />
              <span>What HealthGuardian Does NOT Do:</span>
            </p>
            <div className="space-y-1">
              {section.whatItCannotDo.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <XCircle className="size-3 shrink-0 text-destructive/80 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prominent Safety Note */}
        {section.safetyNote && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            <ShieldAlert className="size-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed font-medium">{section.safetyNote}</p>
          </div>
        )}
      </CardContent>

      {section.routeToOpen && (
        <CardFooter className="pt-0 pb-4 flex justify-end">
          <Button size="sm" asChild className="gap-1.5 text-xs">
            <Link to={section.routeToOpen}>
              <span>{section.buttonLabel || "Open feature"}</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
