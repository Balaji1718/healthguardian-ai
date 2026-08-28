export function calculateConfidence(
  totalCount: number,
  missingRatio: number,
  rateOfChange: number | null,
): number {
  if (totalCount === 0) return 0;
  const countScore = Math.min(totalCount, 10) / 10;
  const coverageScore = 1 - missingRatio;
  const trendScore = rateOfChange != null ? Math.min(Math.abs(rateOfChange) / 2, 1) : 0;

  const rawConfidence = 0.5 * countScore + 0.3 * coverageScore + 0.2 * trendScore;
  return Math.max(0, Math.min(1, rawConfidence));
}
