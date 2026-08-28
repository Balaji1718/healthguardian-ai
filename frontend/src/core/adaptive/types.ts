export type AdaptiveMetric =
  | "sleepHours"
  | "waterGlasses"
  | "exerciseMinutes"
  | "weightKg"
  | "systolicBP"
  | "diastolicBP"
  | "bloodGlucose";

export interface AdaptiveMetricEvidence {
  metric: AdaptiveMetric;
  baseline: number | null;
  recentMedian: number | null;
  recentMean: number | null;
  deviation: number | null;
  rateOfChange: number | null;
  direction: "up" | "down" | "stable" | "unknown";
  evidenceCount: number;
  missingRatio: number;
  confidence: number;
}

export interface HealthContext {
  factors: AdaptiveMetricEvidence[];
  supportingEvidence: AdaptiveMetricEvidence[]; // negative/decline deviations
  conflictingEvidence: AdaptiveMetricEvidence[]; // positive/improvement deviations
  overallConfidence: number;
  explanationSignals: string[];
}
