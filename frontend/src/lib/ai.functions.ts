type Message = { role: "system" | "user" | "assistant"; content: string };

type AICompletionRequest = {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
};

type AICompletionResponse = {
  ok: boolean;
  content: string;
  provider: string | null;
  attempted: string[];
  fallbackOccurred: boolean;
  elapsedMs: number;
  error?: string;
};

export async function aiComplete(input: {
  data: AICompletionRequest;
}): Promise<AICompletionResponse> {
  const started = Date.now();
  const response = await fetch("/api/ai/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.data),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    return {
      ok: false,
      content: "",
      provider: null,
      attempted: [],
      fallbackOccurred: false,
      elapsedMs: Date.now() - started,
      error: payload.error ?? "AI completion request failed",
    };
  }

  const data = (await response.json()) as AICompletionResponse;
  return {
    ...data,
    elapsedMs: Date.now() - started,
    fallbackOccurred: data.ok && data.attempted.length > 1,
  };
}

export async function aiStatus() {
  const response = await fetch("/api/ai/status");
  if (!response.ok) {
    return { providers: [] };
  }
  const data = (await response.json()) as {
    providers?: Array<{ name: string; configured: boolean; model: string }>;
  };
  return { providers: data.providers ?? [] };
}
