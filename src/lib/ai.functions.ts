import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().max(12000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).max(30),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
  json: z.boolean().optional(),
});

export const aiComplete = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }) => {
    const started = Date.now();
    const { routeCompletion } = await import("@/services/ai/providers.server");
    const result = await routeCompletion(data);
    return {
      ok: result.ok,
      content: result.content,
      provider: result.provider,
      attempted: result.attempted,
      fallbackOccurred: result.ok && result.attempted.length > 1,
      elapsedMs: Date.now() - started,
      error: result.ok ? undefined : result.lastError,
    };
  });

export const aiStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { providerAvailability } = await import("@/services/ai/providers.server");
  // Only names/models/configured flags — never key values.
  return { providers: providerAvailability() };
});
