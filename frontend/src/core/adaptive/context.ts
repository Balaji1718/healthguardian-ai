import type { AdaptiveMetricEvidence, HealthContext } from "./types";

export function buildHealthContext(evidence: AdaptiveMetricEvidence[]): HealthContext {
  const supportingEvidence: AdaptiveMetricEvidence[] = [];
  const conflictingEvidence: AdaptiveMetricEvidence[] = [];
  const explanationSignals: string[] = [];

  for (const e of evidence) {
    if (e.deviation == null || e.baseline == null || e.recentMedian == null) continue;

    const absDev = Math.abs(e.deviation);
    const sign = e.deviation > 0 ? "+" : "";

    // Determine significance: absolute deviation should be >= 10% of baseline or a minimum absolute change
    // Minimum absolute thresholds: sleep 0.5h, water 1 glass, exercise 5 min, weight 1kg, BP 5 mmHg, glucose 5 mg/dL
    let isSignificant = false;
    const relDev = e.baseline > 0 ? absDev / e.baseline : 0;

    if (e.metric === "sleepHours" && absDev >= 0.5) isSignificant = true;
    else if (e.metric === "waterGlasses" && absDev >= 1.0) isSignificant = true;
    else if (e.metric === "exerciseMinutes" && absDev >= 5.0) isSignificant = true;
    else if (e.metric === "weightKg" && absDev >= 1.0) isSignificant = true;
    else if (e.metric === "systolicBP" && absDev >= 5.0) isSignificant = true;
    else if (e.metric === "diastolicBP" && absDev >= 4.0) isSignificant = true;
    else if (e.metric === "bloodGlucose" && absDev >= 5.0) isSignificant = true;

    // Relative threshold as a backup (e.g. 10% change)
    if (relDev >= 0.1) isSignificant = true;

    if (!isSignificant) continue;

    // Define negative vs positive impact based on metric type
    let isNegativeTrend = false;
    if (["sleepHours", "waterGlasses", "exerciseMinutes"].includes(e.metric)) {
      isNegativeTrend = e.deviation < 0;
    } else {
      // Vitals/weight: increases are generally watched/negative, decreases are positive
      isNegativeTrend = e.deviation > 0;
    }

    if (isNegativeTrend) {
      supportingEvidence.push(e);
    } else {
      conflictingEvidence.push(e);
    }

    // Construct human-readable signal explanation
    const metricLabel = e.metric
      .replace("Hours", "")
      .replace("Glasses", "")
      .replace("Minutes", "")
      .replace("Kg", "")
      .replace("BP", " BP")
      .replace("Glucose", " glucose");

    const unit =
      e.metric === "sleepHours"
        ? " hours"
        : e.metric === "waterGlasses"
          ? " glasses"
          : e.metric === "exerciseMinutes"
            ? " minutes"
            : e.metric === "weightKg"
              ? " kg"
              : e.metric === "bloodGlucose"
                ? " mg/dL"
                : " mmHg";

    const changeWord = e.deviation > 0 ? "above" : "below";
    explanationSignals.push(
      `Recent ${metricLabel} is ${absDev.toFixed(1)}${unit} ${changeWord} your usual pattern of ${e.baseline.toFixed(1)}${unit}.`,
    );
  }

  // Compute overall confidence as a weighted average of active evidence confidences
  const activeEvidences = [...supportingEvidence, ...conflictingEvidence];
  const overallConfidence = activeEvidences.length
    ? activeEvidences.reduce((sum, e) => sum + e.confidence, 0) / activeEvidences.length
    : 1.0; // Default to 1.0 if no deviations found

  return {
    factors: evidence,
    supportingEvidence,
    conflictingEvidence,
    overallConfidence,
    explanationSignals,
  };
}
