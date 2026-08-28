import "dotenv/config";
import { callProvider, PROVIDER_REGISTRY } from "./ai-provider-router.js";

const newProviderIds = ["mistral", "cohere", "sambanova", "nvidia"];

console.log("=== Phase 8 Live Smoke Test for Newly Added AI Providers ===");
console.log("Running minimal harmless ping ('Reply with the word OK.') for each configured provider...\n");

const smokeResults = [];

for (const providerId of newProviderIds) {
  const provider = PROVIDER_REGISTRY.find((p) => p.id === providerId);
  if (!provider) {
    console.log(`Provider ${providerId} not found in registry.`);
    continue;
  }

  const t0 = Date.now();
  console.log(`Testing ${provider.displayName} (${provider.id})...`);
  try {
    const res = await callProvider(provider, {
      messages: [{ role: "user", content: "Reply with the word OK." }],
      temperature: 0,
      maxTokens: 20,
    });
    const elapsed = Date.now() - t0;

    const resultRecord = {
      provider: provider.id,
      displayName: provider.displayName,
      model: provider.defaultModel,
      ok: res.ok,
      status: res.ok ? "SUCCESS" : (res.quotaRelated ? "QUOTA_LIMITED" : (res.status || "ERROR")),
      elapsedMs: elapsed,
      responseContent: res.ok ? res.content?.trim() : null,
      error: res.error || null,
    };

    smokeResults.push(resultRecord);

    if (res.ok) {
      console.log(`  -> SUCCESS in ${elapsed}ms: "${res.content?.trim()}"`);
    } else {
      console.log(`  -> FAILED/QUOTA in ${elapsed}ms: ${res.error}`);
    }
  } catch (err) {
    console.log(`  -> EXCEPTION in ${Date.now() - t0}ms: ${err.message}`);
    smokeResults.push({
      provider: provider.id,
      displayName: provider.displayName,
      model: provider.defaultModel,
      ok: false,
      status: "EXCEPTION",
      elapsedMs: Date.now() - t0,
      error: err.message,
    });
  }
}

console.log("\n=== Smoke Test Summary Table ===");
console.table(
  smokeResults.map((r) => ({
    Provider: r.displayName,
    Model: r.model,
    Status: r.status,
    Latency: `${r.elapsedMs}ms`,
    Response: r.responseContent ? r.responseContent.slice(0, 30) : r.error,
  })),
);
