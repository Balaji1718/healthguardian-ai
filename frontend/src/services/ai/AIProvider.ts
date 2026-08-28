import type { AIRequest, AIResult, ProviderName } from "./types";

export interface AIProvider {
  readonly name: ProviderName;
  readonly model: string;
  readonly configured: boolean;
  invoke(request: AIRequest): Promise<AIResult>;
  getStatus(): { name: ProviderName; configured: boolean; model: string };
}

export function createProviderFailure(
  name: ProviderName,
  error: string,
  startedAt: number,
): AIResult {
  return {
    ok: false,
    content: "",
    provider: null,
    attempted: [name],
    fallbackOccurred: false,
    elapsedMs: Date.now() - startedAt,
    error,
  };
}
