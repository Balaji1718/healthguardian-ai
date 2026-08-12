export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];
  temperature?: number | undefined;
  maxTokens?: number | undefined;
  json?: boolean | undefined;
}

export interface AIResult {
  ok: boolean;
  content: string;
  provider: string | null;
  attempted: string[];
  fallbackOccurred: boolean;
  elapsedMs: number;
  error?: string;
}

export type ProviderName = "openrouter" | "groq" | "cerebras";
