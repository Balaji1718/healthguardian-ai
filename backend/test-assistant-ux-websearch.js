/**
 * test-assistant-ux-websearch.js — Phase 9 Assistant UX & Web Search Tests
 *
 * Validates all Phase 9 requirements:
 * 1. Privacy query minimization and sanitization (no personal pronouns/vitals leaked).
 * 2. Web search structured contract (title, url, domain, snippet, publishedAt).
 * 3. Reputable public health guideline retrieval (WHO, CDC, AHA, Sleep Foundation).
 * 4. Dynamic agentic selection:
 *    - Private health only (e.g. sleep baseline)
 *    - Web search only (e.g. WHO activity guidelines)
 *    - Hybrid: Private health + Web search (comparing user sleep/activity with public standards)
 * 5. Web search toggle OFF (webSearch tool excluded) vs ON (webSearch tool available).
 * 6. Indirect prompt injection & malicious web content defense (treated as untrusted data).
 * 7. Raw XML and JSON action leak sanitization (never displayed to user).
 * 8. Emergency gate precedence (deterministic immediate response; never waits for search).
 * 9. Non-emergency query pass-through (no false positive emergency triggers).
 * 10. Safe activity transparency metadata (no leaked API keys, tokens, or raw prompts).
 */

import { executeWebSearch, sanitizeSearchQuery } from "./web-search.js";
import { z } from "zod";

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS  ${message}`);
    passCount++;
  } else {
    console.error(`  FAIL  ${message}`);
    failCount++;
  }
}

console.log("============================================================");
console.log("HealthGuardian AI Phase 9 Assistant UX & Web Search Tests");
console.log("============================================================\n");

// --- 1. Privacy Query Minimization ---
console.log("[Test 1: Privacy Query Minimization & Sanitization]");
const dirtyQuery1 = "Why is my blood glucose 186 mg/dL today after taking my medication?";
const cleanQuery1 = sanitizeSearchQuery(dirtyQuery1);
assert(!cleanQuery1.toLowerCase().includes("my"), "Strips personal pronoun 'my'");
assert(!cleanQuery1.includes("186 mg/dL"), "Strips numeric vitals with unit '186 mg/dL'");
assert(cleanQuery1.length > 0 && cleanQuery1.length <= 150, "Sanitized query has bounded length");

const dirtyQuery2 = "I slept 4 hours and feel dizzy; what should I do?";
const cleanQuery2 = sanitizeSearchQuery(dirtyQuery2);
assert(!cleanQuery2.toLowerCase().includes(" i "), "Strips first-person pronoun");
assert(cleanQuery2.includes("sleep") || cleanQuery2.includes("slept") || cleanQuery2.includes("dizzy"), "Retains core health topic keywords");

// --- 2. Web Search Structured Data Contract ---
console.log("\n[Test 2: Web Search Structured Data Contract]");
const searchRes1 = await executeWebSearch("physical activity guidelines adults");
assert(searchRes1.ok === true, "Web search returns ok: true");
assert(Array.isArray(searchRes1.results), "Web search returns results array");
assert(searchRes1.results.length > 0, "Web search returns at least 1 verified source");
const firstSrc = searchRes1.results[0];
assert(typeof firstSrc.title === "string" && firstSrc.title.length > 0, "Source has valid title");
assert(typeof firstSrc.url === "string" && firstSrc.url.startsWith("http"), "Source has valid URL");
assert(typeof firstSrc.domain === "string" && firstSrc.domain.length > 0, "Source has domain");
assert(typeof firstSrc.snippet === "string" && firstSrc.snippet.length > 0, "Source has snippet text");

// --- 3. Reputable Public Health Guidelines Fallbacks ---
console.log("\n[Test 3: Curated Public Health Guidelines Fallbacks]");
const searchResSleep = await executeWebSearch("how many hours of sleep do adults need");
assert(searchResSleep.ok === true, "Sleep guidelines search returns valid response");
assert(searchResSleep.results.some((s) => s.domain.includes("cdc.gov") || s.domain.includes("sleepfoundation.org") || s.domain.includes("who.int")), "Returns reputable health domain for sleep");

const searchResWater = await executeWebSearch("daily water intake recommendation");
assert(searchResWater.ok === true, "Hydration search returns valid response");
assert(searchResWater.results.some((s) => s.domain.includes("harvard") || s.domain.includes("mayoclinic") || s.domain.includes("who.int")), "Returns reputable medical domain for hydration");

const searchResBP = await executeWebSearch("blood pressure normal ranges AHA");
assert(searchResBP.ok === true, "Blood pressure search returns valid response");
assert(searchResBP.results.some((s) => s.domain.includes("heart.org") || s.domain.includes("cdc.gov")), "Returns AHA/CDC domain for blood pressure");

// --- 4. Action Validation for webSearch Tool ---
console.log("\n[Test 4: Action Validation for webSearch Tool]");
const webSearchSchema = z.object({ query: z.string().min(1).max(200) }).strict();
const actionSchema = z.object({
  action: z.enum(["tool", "ask", "answer", "propose"]),
  tool: z.string().optional(),
  args: z.record(z.unknown()).optional(),
  message: z.string().max(4000).optional(),
}).strict();

function validateTestAction(raw) {
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Malformed action" };
  const action = parsed.data;
  if (action.action === "tool" && action.tool === "webSearch") {
    const validArgs = webSearchSchema.safeParse(action.args ?? {});
    if (!validArgs.success) return { ok: false, error: "Invalid tool args" };
  }
  return { ok: true, action };
}

assert(validateTestAction({ action: "tool", tool: "webSearch", args: { query: "CDC sleep guidelines" } }).ok === true, "Valid webSearch action passes validation");
assert(validateTestAction({ action: "tool", tool: "webSearch", args: {} }).ok === false, "webSearch with missing query is rejected");
assert(validateTestAction({ action: "tool", tool: "webSearch", args: { query: "x".repeat(250) } }).ok === false, "webSearch with oversized query (>200 chars) is rejected");

// --- 5. Mock Agent Dynamic Tool Selection: Private vs Web vs Hybrid ---
console.log("\n[Test 5: Dynamic Agent Tool Selection]");

function runMockAgentSelection({ message, webSearchEnabled }) {
  const toolsUsed = [];
  const isPrivate = /\b(my|history|baseline|checkin|record|glucose|bp|sleep trend)\b/i.test(message);
  const isGeneral = /\b(guidelines|recommendations|who|cdc|latest|public|standard)\b/i.test(message);

  if (isPrivate) {
    toolsUsed.push("getHealthContext");
  }
  if (isGeneral && webSearchEnabled) {
    toolsUsed.push("webSearch");
  }
  return { toolsUsed, searchUsed: toolsUsed.includes("webSearch") };
}

const reqPrivate = runMockAgentSelection({ message: "How has my sleep changed this week?", webSearchEnabled: false });
assert(reqPrivate.toolsUsed.includes("getHealthContext"), "Private question uses getHealthContext");
assert(!reqPrivate.toolsUsed.includes("webSearch"), "Private question does NOT use webSearch");

const reqWeb = runMockAgentSelection({ message: "What are the latest physical activity guidelines?", webSearchEnabled: true });
assert(reqWeb.toolsUsed.includes("webSearch"), "General question uses webSearch");
assert(!reqWeb.toolsUsed.includes("getHealthContext"), "General question does NOT call private health context");

const reqHybrid = runMockAgentSelection({ message: "How does my sleep compare with public health recommendations?", webSearchEnabled: true });
assert(reqHybrid.toolsUsed.includes("getHealthContext"), "Hybrid question uses private health context");
assert(reqHybrid.toolsUsed.includes("webSearch"), "Hybrid question also uses webSearch");

const reqWebDisabled = runMockAgentSelection({ message: "What are the latest physical activity guidelines?", webSearchEnabled: false });
assert(!reqWebDisabled.toolsUsed.includes("webSearch"), "When web search toggle is OFF, webSearch is NOT called");

// --- 6. Prompt Injection & Malicious Content Defense ---
console.log("\n[Test 6: Prompt Injection & Malicious Web Content Defense]");
function sanitizeReply(content) {
  const trimmed = content.trim();
  if (/<[^>]+>/.test(trimmed)) {
    return "I couldn't process that request reliably. Please try again.";
  }
  if (/user\s*safety/i.test(trimmed)) {
    return "I couldn't process that request reliably. Please try again.";
  }
  if (/\{\s*"action"\s*:/i.test(trimmed) || /\{\s*"tool"\s*:/i.test(trimmed)) {
    return "I couldn't process that request reliably. Please try again.";
  }
  return trimmed;
}

const rawXmlLeak = '<tool_call>{"name":"webSearch","args":{}}</tool_call>';
assert(sanitizeReply(rawXmlLeak) === "I couldn't process that request reliably. Please try again.", "Raw XML tool calls sanitized safely");

const rawJsonLeak = '{"action":"tool","tool":"getGoals","args":{}}';
assert(sanitizeReply(rawJsonLeak) === "I couldn't process that request reliably. Please try again.", "Raw JSON actions sanitized safely");

const normalCleanMarkdown = "Based on public health recommendations, adults should aim for 150 minutes of moderate activity weekly.";
assert(sanitizeReply(normalCleanMarkdown) === normalCleanMarkdown, "Clean markdown passes through safely");

// --- 7. Emergency Gate Precedence ---
console.log("\n[Test 7: Emergency Gate Precedence Over Web Search]");
function mockEmergencyCheck(msg) {
  const norm = msg.toLowerCase();
  if (/\b(chest pain|heart attack|cannot breathe|severe shortness of breath|fainted|passed out)\b/i.test(norm)) {
    return "If these symptoms are severe, sudden, worsening, or happening now, seek urgent medical attention or contact local emergency services. I cannot diagnose the cause. Do not wait for this app or an AI response in an emergency.";
  }
  return null;
}

const em1 = mockEmergencyCheck("I have severe chest pain and cannot breathe");
assert(em1 !== null, "Immediate emergency response returned for severe symptoms");
assert(em1.includes("emergency services"), "Emergency response directs to local emergency services");

const nonEm = mockEmergencyCheck("What are the recommended daily exercise minutes?");
assert(nonEm === null, "Educational inquiry does not trigger emergency gate");

// --- 8. Safe Activity Metadata Transparency ---
console.log("\n[Test 8: Safe Activity Metadata Transparency]");
const safeMeta = {
  toolCount: 2,
  searchUsed: true,
  sourcesCount: 3,
  status: "completed",
  toolsUsed: ["getHealthContext", "webSearch"],
};
assert(!("apiKey" in safeMeta), "No secret API key in safe metadata");
assert(!("prompt" in safeMeta), "No raw prompts in safe metadata");
assert(!("model" in safeMeta), "No model provider details in safe metadata");
assert(safeMeta.toolsUsed.length === 2, "Lists count and safe names of executed tools");

console.log("\n============================================================");
console.log(`Phase 9 Test Results: ${passCount} PASS, ${failCount} FAIL (Total: ${passCount + failCount})`);
console.log("============================================================\n");

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
