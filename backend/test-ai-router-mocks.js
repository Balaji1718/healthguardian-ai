import assert from "node:assert/strict";
import { resetProviderStates, routeCompletion } from "./ai-provider-router.js";

const request = { messages: [{ role: "user", content: "synthetic fallback test" }] };
const providers = {
  "openrouter.ai": "openrouter",
  "groq.com": "groq",
  "nvidia.com": "nvidia",
  "mistral.ai": "mistral",
  "sambanova.ai": "sambanova",
  "cohere.com": "cohere",
  "cerebras.ai": "cerebras",
};

function response(content, status = 200) {
  return new Response(typeof content === "string" ? content : JSON.stringify(content), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function runCase(testId, name, handler, expected) {
  resetProviderStates();
  const calls = [];
  let active = 0;
  let maxActive = 0;
  globalThis.fetch = async (url) => {
    const provider = Object.entries(providers).find(([key]) => url.includes(key))?.[1] ?? "unknown";
    calls.push(provider);
    active += 1;
    maxActive = Math.max(maxActive, active);
    try {
      return await handler(provider, calls.filter((call) => call === provider).length);
    } finally {
      active -= 1;
    }
  };
  const result = await routeCompletion(request);
  try {
    assert.deepEqual(calls, expected.calls, `${testId} (${name}): provider call order`);
    assert.equal(result.provider, expected.provider, `${testId} (${name}): final provider`);
    assert.equal(maxActive, 1, `${testId} (${name}): calls must be sequential`);
    console.log(`${testId} - PASS: ${name} (Calls: ${calls.join(" -> ")}, Final: ${result.provider})`);
  } catch (err) {
    console.error(`${testId} - FAIL: ${name}. ${err.message}`);
    throw err;
  }
}

console.log("Starting Mocked AI Provider Fallback Tests...");

await runCase(
  "TEST A",
  "OpenRouter succeeds -> Groq must NOT be called -> final provider = OpenRouter",
  async (provider) => provider === "openrouter"
    ? response({ choices: [{ message: { content: "ok" } }] })
    : response("unexpected", 500),
  { calls: ["openrouter"], provider: "openrouter" },
);

await runCase(
  "TEST B",
  "OpenRouter fails with retryable error -> OpenRouter retries once -> Groq succeeds",
  async (provider) => provider === "openrouter"
    ? response("temporary", 503)
    : response({ choices: [{ message: { content: "groq ok" } }] }),
  { calls: ["openrouter", "openrouter", "groq"], provider: "groq" },
);

await runCase(
  "TEST C",
  "OpenRouter fails -> Groq fails -> down to Cerebras attempted",
  async (provider) => provider === "cerebras"
    ? response({ choices: [{ message: { content: "cerebras ok" } }] })
    : response("temporary", 503),
  {
    calls: [
      "openrouter", "openrouter",
      "groq", "groq",
      "nvidia", "nvidia",
      "mistral", "mistral",
      "sambanova", "sambanova",
      "cohere", "cohere",
      "cerebras",
    ],
    provider: "cerebras",
  },
);

await runCase(
  "TEST D",
  "All providers fail -> deterministic/local fallback",
  async () => response("temporary", 503),
  {
    calls: [
      "openrouter", "openrouter",
      "groq", "groq",
      "nvidia", "nvidia",
      "mistral", "mistral",
      "sambanova", "sambanova",
      "cohere", "cohere",
      "cerebras", "cerebras",
    ],
    provider: null,
  },
);

await runCase(
  "TEST E",
  "Provider returns malformed response -> fallback occurs",
  async (provider) => provider === "openrouter"
    ? response({ choices: [] })
    : response({ choices: [{ message: { content: "groq ok" } }] }),
  { calls: ["openrouter", "openrouter", "groq"], provider: "groq" },
);

await runCase(
  "TEST F",
  "Provider timeout -> retry once -> fallback",
  async (provider) => {
    if (provider === "openrouter") {
      const error = new Error("timed out");
      error.name = "AbortError";
      throw error;
    }
    return response({ choices: [{ message: { content: "groq ok" } }] });
  },
  { calls: ["openrouter", "openrouter", "groq"], provider: "groq" },
);

await runCase(
  "TEST G",
  "Provider returns non-retryable client error -> do not retry indefinitely -> advance to next provider",
  async (provider) => {
    if (provider === "openrouter") return response("bad request", 400);
    return response({ choices: [{ message: { content: "groq ok" } }] });
  },
  { calls: ["openrouter", "groq"], provider: "groq" },
);

globalThis.fetch = fetch;
console.log("All Mocked AI Provider Fallback Tests completed successfully.");
