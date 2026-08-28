export const FALLBACK_AI_MESSAGE =
  "AI assistance is temporarily unavailable. Your health data and preventive analysis are still available.";

export function buildDeterministicFallbackResponse() {
  return {
    ok: false,
    content: FALLBACK_AI_MESSAGE,
    provider: null,
    attempted: [],
    fallbackOccurred: true,
    elapsedMs: 0,
    error: "all-providers-unavailable",
  };
}
