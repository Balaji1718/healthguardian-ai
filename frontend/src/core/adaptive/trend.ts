export function calculateRateOfChange(recentValues: number[]): number | null {
  if (recentValues.length <= 1) return null;
  const first = recentValues[0];
  const last = recentValues[recentValues.length - 1];
  if (first == null || last == null) return null;
  return (last - first) / (recentValues.length - 1);
}

export function determineDirection(deviation: number | null): "up" | "down" | "stable" | "unknown" {
  if (deviation == null) return "unknown";
  if (deviation > 0.01) return "up";
  if (deviation < -0.01) return "down";
  return "stable";
}
