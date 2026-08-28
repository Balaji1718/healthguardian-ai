import type { DailyCheckin } from "@/models";
import type { AdaptiveMetric, AdaptiveMetricEvidence } from "./types";
import { ADAPTIVE_CONFIG } from "./config";
import { toDate } from "@/services/firebase/repositories";

export const calculateMedian = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

const asc = (checkins: DailyCheckin[]) =>
  [...checkins].sort((a, b) => (toDate(a.date)?.getTime() ?? 0) - (toDate(b.date)?.getTime() ?? 0));

export function calculatePersonalBaseline(
  checkins: DailyCheckin[],
  metric: AdaptiveMetric,
  recentCount = ADAPTIVE_CONFIG.recentWindowSize,
): AdaptiveMetricEvidence {
  const ordered = asc(checkins);
  const values = ordered
    .map((c) => c[metric])
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));

  const minReq = ADAPTIVE_CONFIG.minEvidence[metric];
  const missingRatio = ordered.length ? 1 - values.length / ordered.length : 1;

  if (values.length < minReq) {
    return {
      metric,
      baseline: null,
      recentMedian: null,
      recentMean: null,
      deviation: null,
      rateOfChange: null,
      direction: "unknown",
      evidenceCount: values.length,
      missingRatio,
      confidence: 0,
    };
  }

  const recent = values.slice(-recentCount);
  const baselineValues = values.slice(0, Math.max(0, values.length - recent.length));

  if (baselineValues.length < ADAPTIVE_CONFIG.minBaselineObservations) {
    return {
      metric,
      baseline: null,
      recentMedian: calculateMedian(recent),
      recentMean: recent.length
        ? recent.reduce((sum, value) => sum + value, 0) / recent.length
        : null,
      deviation: null,
      rateOfChange: null,
      direction: "unknown",
      evidenceCount: values.length,
      missingRatio,
      confidence: 0,
    };
  }

  const baselineValuesForComparison = baselineValues;

  const baseline = calculateMedian(baselineValuesForComparison);
  const recentMedian = calculateMedian(recent);
  const recentMean = recent.length
    ? recent.reduce((sum, value) => sum + value, 0) / recent.length
    : null;

  // Deviation and trends will be filled in, but we can compute them inside this function or delegate
  const deviation = baseline != null && recentMedian != null ? recentMedian - baseline : null;

  const first = recent[0];
  const last = recent[recent.length - 1];
  const rateOfChange =
    first != null && last != null && recent.length > 1
      ? (last - first) / (recent.length - 1)
      : null;

  const direction =
    deviation == null ? "unknown" : deviation > 0 ? "up" : deviation < 0 ? "down" : "stable";

  // Calculate v2 confidence
  const countScore = Math.min(values.length, 10) / 10;
  const trendScore = rateOfChange != null ? Math.min(Math.abs(rateOfChange) / 2, 1) : 0;
  const confidence = Math.max(
    0,
    Math.min(1, 0.5 * countScore + 0.3 * (1 - missingRatio) + 0.2 * trendScore),
  );

  return {
    metric,
    baseline,
    recentMedian,
    recentMean,
    deviation,
    rateOfChange,
    direction,
    evidenceCount: values.length,
    missingRatio,
    confidence,
  };
}

export function calculateAdaptiveEvidence(checkins: DailyCheckin[]): AdaptiveMetricEvidence[] {
  return [
    "sleepHours",
    "waterGlasses",
    "exerciseMinutes",
    "weightKg",
    "systolicBP",
    "diastolicBP",
    "bloodGlucose",
  ].map((metric) => calculatePersonalBaseline(checkins, metric as AdaptiveMetric));
}
