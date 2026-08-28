export type GuideCategory =
  "overview" | "getting_started" | "core_features" | "adaptive_ai" | "privacy_safety";

export interface GuideSection {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  category: GuideCategory;
  summary: string;
  keyPoints: string[];
  beginnerExplanation: string;
  learnMoreExplanation?: string;
  technicalDetails?: string;
  dataFlowDescription?: string;
  exampleScenario?: {
    scenario: string;
    result: string;
  };
  whatItCannotDo?: string[];
  routeToOpen?: string;
  buttonLabel?: string;
  safetyNote?: string;
}

export interface GuidedTourStep {
  stepNumber: number;
  title: string;
  sectionId: string;
  targetRoute: string;
  targetLabel: string;
  description: string;
  actionPrompt: string;
  keyTakeaway: string;
}
