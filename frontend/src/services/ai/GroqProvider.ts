import type { AIProvider } from "./AIProvider";
import type { AIRequest, AIResult, ProviderName } from "./types";

export class GroqProvider implements AIProvider {
  readonly name: ProviderName = "groq";
  readonly model: string;
  readonly configured: boolean;

  constructor() {
    this.model = process.env["GROQ_MODEL"] || "llama-3.3-70b-versatile";
    this.configured = Boolean(process.env["GROQ_API_KEY"]);
  }

  getStatus() {
    return { name: this.name, configured: this.configured, model: this.model };
  }

  async invoke(request: AIRequest): Promise<AIResult> {
    const startedAt = Date.now();
    const apiKey = process.env["GROQ_API_KEY"];

    if (!apiKey) {
      return {
        ok: false,
        content: "",
        provider: null,
        attempted: [this.name],
        fallbackOccurred: false,
        elapsedMs: Date.now() - startedAt,
        error: "groq: no API key configured",
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25_000);

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.3,
          max_tokens: request.maxTokens ?? 900,
          ...(request.json ? { response_format: { type: "json_object" } } : {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          ok: false,
          content: "",
          provider: null,
          attempted: [this.name],
          fallbackOccurred: false,
          elapsedMs: Date.now() - startedAt,
          error: `groq: HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content || typeof content !== "string") {
        return {
          ok: false,
          content: "",
          provider: null,
          attempted: [this.name],
          fallbackOccurred: false,
          elapsedMs: Date.now() - startedAt,
          error: "groq: malformed response",
        };
      }

      return {
        ok: true,
        content,
        provider: this.name,
        attempted: [this.name],
        fallbackOccurred: false,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "groq: timeout"
          : "groq: network error";
      return {
        ok: false,
        content: "",
        provider: null,
        attempted: [this.name],
        fallbackOccurred: false,
        elapsedMs: Date.now() - startedAt,
        error: message,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
