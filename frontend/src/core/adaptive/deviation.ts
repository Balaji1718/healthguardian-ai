export function calculateDeviation(
  recentMedian: number | null,
  baseline: number | null,
): number | null {
  if (recentMedian == null || baseline == null) return null;
  return recentMedian - baseline;
}

export function calculateRelativeDeviation(
  deviation: number | null,
  baseline: number | null,
): number | null {
  if (deviation == null || baseline == null || baseline === 0) return null;
  return deviation / baseline;
}
