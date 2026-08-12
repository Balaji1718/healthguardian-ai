import type { AIRequest, ProviderName } from "./types";

/**
 * Provider adapters run on the server only. API keys are read from the server
 * environment at call time and are never sent to, or logged in, the browser.
 */

interface ProviderConfig {
  name: ProviderName;
  apiKey: string | undefined;
  baseUrl: string;
  model: string;
}

function configs(): ProviderConfig[] {
  return [
    {
      name: "openrouter",
      apiKey: process.env["OPENROUTER_API_KEY"],
      baseUrl: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env["OPENROUTER_MODEL"] || "openrouter/free",
    },
    {
      name: "groq",
      apiKey: process.env["GROQ_API_KEY"],
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      model: process.env["GROQ_MODEL"] || "llama-3.3-70b-versatile",
    },
    {
      name: "cerebras",
      apiKey: process.env["CEREBRAS_API_KEY"],
      baseUrl: "https://api.cerebras.ai/v1/chat/completions",
      model: process.env["CEREBRAS_MODEL"] || "llama-3.3-70b",
    },
  ];
}

const TIMEOUT_MS = 25_000;

class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

async function callProvider(cfg: ProviderConfig, req: AIRequest): Promise<string> {
  if (!cfg.apiKey) throw new ProviderError(`${cfg.name}: no API key configured`, true);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(cfg.baseUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: req.messages,
        temperature: req.temperature ?? 0.3,
        max_tokens: req.maxTokens ?? 900,
        ...(req.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      const retryable = res.status === 429 || res.status >= 500 || res.status === 402 || res.status === 401;
      throw new ProviderError(`${cfg.name}: HTTP ${res.status}`, retryable);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") throw new ProviderError(`${cfg.name}: malformed response`, true);
    return content;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    throw new ProviderError(`${cfg.name}: ${(e as Error).name === "AbortError" ? "timeout" : "network error"}`, true);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Router: one request → one provider. The next provider is only tried after a
 * retryable failure (rate limit, timeout, network, server error, malformed body).
 */
export async function routeCompletion(req: AIRequest) {
  const attempted: string[] = [];
  let lastError = "No AI provider is configured.";
  for (const cfg of configs()) {
    attempted.push(cfg.name);
    try {
      const content = await callProvider(cfg, req);
      return { ok: true, content, provider: cfg.name, attempted, lastError: undefined as string | undefined };
    } catch (e) {
      const err = e as ProviderError;
      lastError = err.message;
      // Never log keys; only the provider name and failure reason.
      console.warn("[ai-router] provider failed:", err.message);
      if (!err.retryable) break;
    }
  }
  return { ok: false, content: "", provider: null, attempted, lastError };
}

export function providerAvailability() {
  return configs().map((c) => ({ name: c.name, configured: Boolean(c.apiKey), model: c.model }));
}
