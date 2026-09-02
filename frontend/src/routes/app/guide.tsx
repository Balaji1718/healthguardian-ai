import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CheckCircle,
  Compass,
  Filter,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLocalizedGuideSections } from "@/features/guide/guide-translations";
import { GuidedTourModal } from "@/features/guide/GuidedTourModal";
import {
  AgenticDecisionDiagram,
  DataFlowDiagram,
  ThreeLayerRiskDiagram,
} from "@/features/guide/GuideFlowDiagram";
import { GuideSectionCard } from "@/features/guide/GuideSectionCard";
import type { GuideCategory } from "@/features/guide/types";

import { useTranslation } from "@/locales/i18n";

export const Route = createFileRoute("/app/guide")({
  component: GuidePage,
  head: () => ({
    meta: [
      { title: "Help & Guide — HealthGuardian AI" },
      {
        name: "description",
        content:
          "Learn how HealthGuardian AI works, how to log data, how adaptive health analysis functions, and how to use the AI assistant.",
      },
      { property: "og:title", content: "HealthGuardian Help & Guide" },
      {
        property: "og:description",
        content:
          "Complete user guide, tutorials, data flow diagrams, and safety information for HealthGuardian AI.",
      },
    ],
  }),
});

function GuidePage() {
  const { t, language } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GuideCategory | "all">("all");
  const [tourOpen, setTourOpen] = useState(false);
  const [activeTourStepIndex, setActiveTourStepIndex] = useState(0);

  const localizedSections = useMemo(() => getLocalizedGuideSections(language), [language]);

  const filteredSections = useMemo(() => {
    return localizedSections.filter((section) => {
      const matchesCategory = selectedCategory === "all" || section.category === selectedCategory;
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        section.title.toLowerCase().includes(query) ||
        section.subtitle.toLowerCase().includes(query) ||
        section.summary.toLowerCase().includes(query) ||
        section.keyPoints.some((p) => p.toLowerCase().includes(query)) ||
        section.beginnerExplanation.toLowerCase().includes(query)
      );
    });
  }, [localizedSections, searchQuery, selectedCategory]);

  const handleStartTour = () => {
    setActiveTourStepIndex(0);
    setTourOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("guide.title")}
        description={t("guide.subtitle")}
        action={
          <Button onClick={handleStartTour} className="gap-2 shadow-xs">
            <Compass className="size-4" />
            <span>{t("guide.startTour")}</span>
          </Button>
        }
      />

      {/* Top Welcome Card with Quick Stats */}
      <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-background text-primary border-primary/20 text-xs font-semibold gap-1"
              >
                <BookOpen className="size-3" />
                <span>{t("guide.interactiveLearning")}</span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {localizedSections.length} {t("guide.topicsAvailable")}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              {t("guide.masterJourney")}
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartTour}
            className="gap-1.5 self-start sm:self-auto text-xs"
          >
            <Sparkles className="size-3.5 text-primary" />
            <span>{t("guide.twoMinuteWalkthrough")}</span>
          </Button>
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {t("guide.welcomeBannerDesc")}
        </p>

        {/* Visual Architecture Highlight */}
        <div className="pt-2">
          <DataFlowDiagram />
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("guide.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs sm:text-sm h-9"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="size-3.5 text-muted-foreground shrink-0 hidden sm:block" />
          {(
            [
              { id: "all", labelKey: "guide.categories.all" },
              { id: "overview", labelKey: "guide.categories.overview" },
              { id: "getting_started", labelKey: "guide.categories.getting_started" },
              { id: "core_features", labelKey: "guide.categories.core_features" },
              { id: "adaptive_ai", labelKey: "guide.categories.adaptive_ai" },
              { id: "privacy_safety", labelKey: "guide.categories.privacy_safety" },
            ] as const
          ).map(({ id, labelKey }) => {
            const active = selectedCategory === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedCategory(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t(labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Key Architectural Diagrams Section */}
      {(selectedCategory === "all" || selectedCategory === "adaptive_ai") && !searchQuery && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("guide.deepDiveTitle")}
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">{t("guide.threeLayerTitle")}</p>
              <ThreeLayerRiskDiagram />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground">{t("guide.agenticLoopTitle")}</p>
              <AgenticDecisionDiagram />
            </div>
          </div>
        </div>
      )}

      {/* Guide Cards Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            {t("guide.learningSections")} ({filteredSections.length})
          </h2>
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-xs h-7 text-muted-foreground"
            >
              {t("guide.clearFilters")}
            </Button>
          )}
        </div>

        {filteredSections.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">{t("guide.noMatchingTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("guide.noMatchingDesc")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
              className="mt-2 text-xs"
            >
              {t("guide.viewAllTopics")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredSections.map((section) => (
              <GuideSectionCard key={section.id} section={section} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Emergency Banner */}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ShieldAlert className="size-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs sm:text-sm font-bold text-destructive">
              {t("guide.emergencyNoticeTitle")}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("guide.emergencyNoticeDesc")}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleStartTour}
          className="shrink-0 text-xs self-end sm:self-auto"
        >
          {t("guide.restartAppTour")}
        </Button>
      </div>

      {/* Global Guided Tour Modal */}
      <GuidedTourModal
        open={tourOpen}
        onOpenChange={setTourOpen}
        initialStepIndex={activeTourStepIndex}
      />
    </div>
  );
}
