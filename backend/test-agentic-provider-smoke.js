import "dotenv/config";
import { callProvider, PROVIDER_REGISTRY } from "./ai-provider-router.js";

const SYSTEM_PROMPT_AGENTIC = `You are HealthGuardian, a bounded preventive-health assistant.
Available tools:
[READ ] getGoals({}): The user's active health goals.
[READ ] getHealthContext({}): Full adaptive health context.

Reply ONLY with JSON:
{"action":"tool","tool":"<name>","args":{...}}
{"action":"answer","message":"<final answer>"}`;

console.log("=== Phase 8 Minimal Agentic Tool-Call Smoke Test ===");

const providersToTest = ["mistral", "nvidia", "cohere"];

for (const providerId of providersToTest) {
  const provider = PROVIDER_REGISTRY.find((p) => p.id === providerId);
  if (!provider) continue;

  console.log(`Testing Agentic Structured Tool Selection for ${provider.displayName}...`);
  try {
    const res = await callProvider(provider, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT_AGENTIC },
        { role: "user", content: "Do I have any active goals?" },
      ],
      temperature: 0.1,
      maxTokens: 100,
      json: true,
    });

    if (res.ok) {
      console.log(`  -> Response: ${res.content?.trim()}`);
      let parsed;
      try {
        parsed = JSON.parse(res.content.match(/\{[\s\S]*\}/)?.[0] || res.content);
      } catch (e) {
        parsed = null;
      }
      const isTool = parsed?.action === "tool" && parsed?.tool === "getGoals";
      const isAnswer = parsed?.action === "answer";
      console.log(`  -> JSON Valid: ${Boolean(parsed)}, Action: ${parsed?.action}, Tool: ${parsed?.tool}`);
      console.log(`  -> Agentic Compatibility: ${isTool || isAnswer ? "SUITABLE FOR AGENTIC PLANNING" : "TEXT ONLY"}\n`);
    } else {
      console.log(`  -> Failed: ${res.error}\n`);
    }
  } catch (err) {
    console.log(`  -> Exception: ${err.message}\n`);
  }
}
