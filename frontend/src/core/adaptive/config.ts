import type { AdaptiveMetric } from "./types";

export const ADAPTIVE_CONFIG: {
  recentWindowSize: number;
  minEvidence: Record<AdaptiveMetric, number>;
  minBaselineObservations: number;
  uiAlertConfidence: number;
  notificationAlertConfidence: number;
} = {
  recentWindowSize: 5,
  minEvidence: {
    sleepHours: 5,
    waterGlasses: 5,
    exerciseMinutes: 5,
    weightKg: 3,
    systolicBP: 3,
    diastolicBP: 3,
    bloodGlucose: 3,
  },
  minBaselineObservations: 3,
  uiAlertConfidence: 0.6,
  notificationAlertConfidence: 0.7,
};
