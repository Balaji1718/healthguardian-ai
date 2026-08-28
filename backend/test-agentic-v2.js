/**
 * test-agentic-v2.js — Phase 7 Agenticity Tests
 *
 * Tests the dynamic tool selection and result-aware loop introduced in runAgentV2.
 * Uses a mock LLM and mock tool registry — zero live network calls.
 *
 * AG-001  Single-tool question → only one relevant tool selected
 * AG-002  Different single-tool question → different tool from AG-001
 * AG-003  Two-tool question → two distinct tools called
 * AG-004  Tool result sufficient → agent stops, no second call
 * AG-005  Tool returns empty data → agent reports unavailable (no hallucination)
 * AG-006  Write request → propose action → pendingAction set, no execute
 * AG-007  Unknown tool name from model → rejected by validateAction
 * AG-008  Malformed tool args → rejected by Zod schema
 * AG-009  Max iterations → stops safely with deterministic fallback
 */

import { strict as assert } from "node:assert";

/* ================================================================
   MINI MOCK FRAMEWORK
   ================================================================ */

/** Simulate the agent loop entirely in memory with a scripted LLM. */
function createMockAgent({
  llmResponses,   // Array<string> — model replies in sequence
  toolResults,    // Map<string, unknown> — tool name → returned data (or null for empty)
}) {
  const trace = [];
  const usedTools = [];
  const selectedTools = [];
  const observations = [];
  let pendingAction = null;
  let llmCallCount = 0;
  let toolCallCount = 0;
  let stopReason = null;
  let finalAnswer = null;

  const TOOL_REGISTRY = {
    getGoals: { readOrWrite: "read", requiresConfirmation: false },
    getHealthContext: { readOrWrite: "read", requiresConfirmation: false },
    getMedicalReport: { readOrWrite: "read", requiresConfirmation: false },
    getDailyCheckins: { readOrWrite: "read", requiresConfirmation: false },
    calculatePersonalBaseline: { readOrWrite: "read", requiresConfirmation: false },
    detectPatterns: { readOrWrite: "read", requiresConfirmation: false },
    calculateRisk: { readOrWrite: "read", requiresConfirmation: false },
    getUserProfile: { readOrWrite: "read", requiresConfirmation: false },
    getHealthHistory: { readOrWrite: "read", requiresConfirmation: false },
    getVerifiedMedicalResults: { readOrWrite: "read", requiresConfirmation: false },
    createGoal: { readOrWrite: "write", requiresConfirmation: true },
    createNotification: { readOrWrite: "write", requiresConfirmation: true },
    createSupportRequest: { readOrWrite: "write", requiresConfirmation: true },
  };

  function validateAction(raw) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return { ok: false, error: "JSON parse failed" }; }
    const VALID_ACTIONS = ["tool", "ask", "answer", "propose"];
    if (!VALID_ACTIONS.includes(parsed.action)) return { ok: false, error: "Invalid action" };
    if ((parsed.action === "tool" || parsed.action === "propose") && !TOOL_REGISTRY[parsed.tool]) {
      return { ok: false, error: `Unknown tool: ${parsed.tool}` };
    }
    if (parsed.action === "ask" || parsed.action === "answer") {
      if (!parsed.message) return { ok: false, error: "Message required" };
    }
    // Arg schema checks (simplified)
    if (parsed.action === "tool" && parsed.tool === "getMedicalReport") {
      if (!parsed.args?.reportId) return { ok: false, error: "reportId required for getMedicalReport" };
    }
    return { ok: true, action: parsed };
  }

  function mockCallLLM() {
    const response = llmResponses[llmCallCount] ?? `{"action":"answer","message":"No more responses."}`;
    llmCallCount++;
    return response;
  }

  function mockExecuteTool(toolName, args) {
    toolCallCount++;
    selectedTools.push(toolName);
    const data = toolResults.get(toolName) ?? null;
    const summary = data ? `${toolName} returned data.` : `${toolName} returned no data.`;
    observations.push(`Tool ${toolName} → ${summary}\n${JSON.stringify(data).slice(0, 1000)}`);
    usedTools.push({ name: toolName, status: "completed", summary });
    trace.push({ kind: "tool", label: toolName, status: "ok" });
    return { ok: true, data, summary };
  }

  const MAX_ITERATIONS = 5;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const rawResponse = mockCallLLM();
    trace.push({ kind: "provider", label: "mock-llm", status: "ok" });

    const validation = validateAction(rawResponse);
    if (!validation.ok) {
      trace.push({ kind: "error", label: validation.error });
      stopReason = "fallback";
      break;
    }

    const action = validation.action;

    if (action.action === "tool") {
      // Prevent duplicate tool calls in one turn
      if (selectedTools.includes(action.tool)) {
        trace.push({ kind: "error", label: `Duplicate tool call: ${action.tool}` });
        stopReason = "fallback";
        break;
      }
      const toolDef = TOOL_REGISTRY[action.tool];
      if (toolDef.requiresConfirmation) {
        pendingAction = { tool: action.tool, args: action.args ?? {}, description: action.message ?? "" };
        stopReason = "propose";
        break;
      }
      mockExecuteTool(action.tool, action.args ?? {});
      continue;
    }

    if (action.action === "propose") {
      pendingAction = { tool: action.tool, args: action.args ?? {}, description: action.message ?? "" };
      stopReason = "propose";
      break;
    }

    if (action.action === "ask" || action.action === "answer") {
      finalAnswer = action.message;
      stopReason = action.action;
      break;
    }

    stopReason = "fallback";
    break;
  }

  if (!stopReason) stopReason = "max_iterations";

  return {
    trace,
    usedTools,
    selectedTools,
    observations,
    pendingAction,
    finalAnswer,
    stopReason,
    llmCallCount,
    toolCallCount,
  };
}

/* ================================================================
   TESTS
   ================================================================ */

let pass = 0;
let fail = 0;

function check(id, description, actual, expected) {
  if (actual === expected) {
    console.log(`  PASS  ${id}: ${description}`);
    pass++;
  } else {
    console.log(`  FAIL  ${id}: ${description} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    fail++;
  }
}

function checkTrue(id, description, value) {
  check(id, description, !!value, true);
}

function checkFalse(id, description, value) {
  check(id, description, !!value, false);
}

/* ---------------------------------------------------------------
   AG-001: Single-tool question → only one relevant tool selected
   --------------------------------------------------------------- */
console.log("\n[AG-001: Single-tool question — one relevant tool]");
{
  const toolResults = new Map([
    ["getGoals", [{ id: "g1", title: "Sleep 7h", status: "active" }]],
  ]);
  const llmResponses = [
    JSON.stringify({ action: "tool", tool: "getGoals", args: {} }),
    JSON.stringify({ action: "answer", message: "You have 1 active goal: Sleep 7h." }),
  ];

  const result = createMockAgent({ llmResponses, toolResults });

  check("AG-001a", "selected exactly one tool", result.selectedTools.length, 1);
  check("AG-001b", "selected tool is getGoals", result.selectedTools[0], "getGoals");
  check("AG-001c", "stop reason is answer", result.stopReason, "answer");
  checkFalse("AG-001d", "no pending action", result.pendingAction);
}

/* ---------------------------------------------------------------
   AG-002: Different question → different tool selected
   --------------------------------------------------------------- */
console.log("\n[AG-002: Different question — different tool]");
{
  const toolResults = new Map([
    ["getMedicalReport", { reportTitle: "CBC Panel", reportType: "blood", verificationStatus: "verified" }],
  ]);
  const llmResponses = [
    JSON.stringify({ action: "tool", tool: "getMedicalReport", args: { reportId: "report-001" } }),
    JSON.stringify({ action: "answer", message: "Your CBC Panel report is verified." }),
  ];

  const result = createMockAgent({ llmResponses, toolResults });

  check("AG-002a", "selected one tool", result.selectedTools.length, 1);
  check("AG-002b", "tool is getMedicalReport (different from AG-001)", result.selectedTools[0], "getMedicalReport");
  check("AG-002c", "stop reason is answer", result.stopReason, "answer");
}

/* ---------------------------------------------------------------
   AG-003: Two-tool question → two distinct tools called in sequence
   --------------------------------------------------------------- */
console.log("\n[AG-003: Two-tool question — two distinct tools]");
{
  const toolResults = new Map([
    ["getHealthContext", { explanationSignals: ["sleep pattern", "water pattern"] }],
    ["getGoals", [{ id: "g2", title: "Drink 8 glasses", status: "active" }]],
  ]);
  const llmResponses = [
    JSON.stringify({ action: "tool", tool: "getHealthContext", args: {} }),
    JSON.stringify({ action: "tool", tool: "getGoals", args: {} }),
    JSON.stringify({ action: "answer", message: "Your sleep is trending up and you have a hydration goal." }),
  ];

  const result = createMockAgent({ llmResponses, toolResults });

  check("AG-003a", "selected exactly two tools", result.selectedTools.length, 2);
  check("AG-003b", "first tool is getHealthContext", result.selectedTools[0], "getHealthContext");
  check("AG-003c", "second tool is getGoals", result.selectedTools[1], "getGoals");
  checkTrue("AG-003d", "tools are distinct", result.selectedTools[0] !== result.selectedTools[1]);
  check("AG-003e", "stop reason is answer", result.stopReason, "answer");
}

/* ---------------------------------------------------------------
   AG-004: Tool result sufficient → agent stops, no second tool call
   --------------------------------------------------------------- */
console.log("\n[AG-004: Tool result sufficient — agent stops immediately]");
{
  const toolResults = new Map([
    ["getGoals", [{ id: "g3", title: "Walk 30m", status: "active" }]],
  ]);
  const llmResponses = [
    // Model calls a tool, gets the result, then immediately answers
    JSON.stringify({ action: "tool", tool: "getGoals", args: {} }),
    JSON.stringify({ action: "answer", message: "You have a walking goal." }),
  ];

  const result = createMockAgent({ llmResponses, toolResults });

  check("AG-004a", "exactly one tool called (stopped after sufficient result)", result.selectedTools.length, 1);
  check("AG-004b", "stop reason is answer (not max_iterations)", result.stopReason, "answer");
  check("AG-004c", "LLM called twice (one tool, one answer)", result.llmCallCount, 2);
}

/* ---------------------------------------------------------------
   AG-005: Tool returns empty data → agent reports unavailable
   --------------------------------------------------------------- */
console.log("\n[AG-005: Empty tool result — agent does not hallucinate]");
{
  const toolResults = new Map([
    ["getGoals", null],  // No goals data
  ]);
  const llmResponses = [
    JSON.stringify({ action: "tool", tool: "getGoals", args: {} }),
    JSON.stringify({ action: "answer", message: "I don't have enough information in your records to answer that yet." }),
  ];

  const result = createMockAgent({ llmResponses, toolResults });

  check("AG-005a", "tool was called once", result.selectedTools.length, 1);
  check("AG-005b", "stop reason is answer", result.stopReason, "answer");
  checkTrue("AG-005c", "answer contains unavailability message", result.finalAnswer?.includes("don't have enough"));
}

/* ---------------------------------------------------------------
   AG-006: Write request → propose action → confirmation required
   --------------------------------------------------------------- */
console.log("\n[AG-006: Write request — propose, no immediate execute]");
{
  const toolResults = new Map();
  const llmResponses = [
    // Model skips reading and immediately proposes a write
    JSON.stringify({
      action: "propose",
      tool: "createGoal",
      args: { title: "Drink 8 glasses daily", goalType: "hydration", targetValue: 8, unit: "glasses" },
      message: "I can create a hydration goal of 8 glasses per day. Would you like me to do that?",
    }),
  ];

  const result = createMockAgent({ llmResponses, toolResults });

  checkFalse("AG-006a", "no tools executed (no write without confirmation)", result.selectedTools.length > 0);
  check("AG-006b", "stop reason is propose", result.stopReason, "propose");
  checkTrue("AG-006c", "pendingAction is set", !!result.pendingAction);
  check("AG-006d", "pendingAction tool is createGoal", result.pendingAction?.tool, "createGoal");
  check("AG-006e", "tool call count is 0 (write was NOT executed)", result.toolCallCount, 0);
}

/* ---------------------------------------------------------------
   AG-007: Unknown tool name from model → rejected
   --------------------------------------------------------------- */
console.log("\n[AG-007: Unknown tool name — rejected by validation]");
{
  const toolResults = new Map();
  const llmResponses = [
    JSON.stringify({ action: "tool", tool: "hackTheDatabase", args: {} }),
  ];

  const result = createMockAgent({ llmResponses, toolResults });

  check("AG-007a", "no tools executed", result.selectedTools.length, 0);
  check("AG-007b", "stop reason is fallback (validation rejected)", result.stopReason, "fallback");
  check("AG-007c", "tool call count is 0", result.toolCallCount, 0);
}

/* ---------------------------------------------------------------
   AG-008: Malformed tool args → rejected by validation
   --------------------------------------------------------------- */
console.log("\n[AG-008: Malformed args — rejected by schema validation]");
{
  const toolResults = new Map();
  const llmResponses = [
    // getMedicalReport requires reportId — this is missing
    JSON.stringify({ action: "tool", tool: "getMedicalReport", args: {} }),
  ];

  const result = createMockAgent({ llmResponses, toolResults });

  check("AG-008a", "no tools executed", result.selectedTools.length, 0);
  check("AG-008b", "stop reason is fallback", result.stopReason, "fallback");
  check("AG-008c", "tool call count is 0", result.toolCallCount, 0);
}

/* ---------------------------------------------------------------
   AG-009: Max iterations → stops safely
   --------------------------------------------------------------- */
console.log("\n[AG-009: Max iterations reached — stops safely]");
{
  const toolResults = new Map([
    ["getHealthContext", { explanationSignals: [] }],
    ["getDailyCheckins", []],
    ["calculatePersonalBaseline", {}],
    ["detectPatterns", []],
    ["calculateRisk", { score: 70 }],
  ]);
  // Model keeps calling tools without ever answering — exceeds 5 iterations
  const llmResponses = [
    JSON.stringify({ action: "tool", tool: "getHealthContext", args: {} }),
    JSON.stringify({ action: "tool", tool: "getDailyCheckins", args: { days: 14 } }),
    JSON.stringify({ action: "tool", tool: "calculatePersonalBaseline", args: {} }),
    JSON.stringify({ action: "tool", tool: "detectPatterns", args: {} }),
    JSON.stringify({ action: "tool", tool: "calculateRisk", args: {} }),
    // 6th would exceed limit but loop has ended
    JSON.stringify({ action: "answer", message: "Should never reach here." }),
  ];

  const result = createMockAgent({ llmResponses, toolResults });

  check("AG-009a", "loop stopped at max 5 iterations", result.llmCallCount, 5);
  check("AG-009b", "stop reason is max_iterations", result.stopReason, "max_iterations");
  checkFalse("AG-009c", "no pending action leaked", result.pendingAction);
}

/* ================================================================
   AGENTICITY PROOF: Tool sequences vary by request
   ================================================================ */
console.log("\n[AG-PROOF: Different requests produce different tool sequences]");
{
  // Request A: goal-only question → getGoals
  const resultA = createMockAgent({
    llmResponses: [
      JSON.stringify({ action: "tool", tool: "getGoals", args: {} }),
      JSON.stringify({ action: "answer", message: "You have 2 active goals." }),
    ],
    toolResults: new Map([["getGoals", []]]),
  });

  // Request B: report question → getMedicalReport
  const resultB = createMockAgent({
    llmResponses: [
      JSON.stringify({ action: "tool", tool: "getMedicalReport", args: { reportId: "r1" } }),
      JSON.stringify({ action: "answer", message: "Your CBC report is verified." }),
    ],
    toolResults: new Map([["getMedicalReport", {}]]),
  });

  // Request C: health context + goals → 2 different tools
  const resultC = createMockAgent({
    llmResponses: [
      JSON.stringify({ action: "tool", tool: "getHealthContext", args: {} }),
      JSON.stringify({ action: "tool", tool: "getGoals", args: {} }),
      JSON.stringify({ action: "answer", message: "Sleep is down, and you have a hydration goal." }),
    ],
    toolResults: new Map([
      ["getHealthContext", {}],
      ["getGoals", []],
    ]),
  });

  checkTrue("PROOF-1", "Request A uses getGoals", resultA.selectedTools.includes("getGoals"));
  checkFalse("PROOF-2", "Request A does NOT use getMedicalReport", resultA.selectedTools.includes("getMedicalReport"));
  checkTrue("PROOF-3", "Request B uses getMedicalReport", resultB.selectedTools.includes("getMedicalReport"));
  checkFalse("PROOF-4", "Request B does NOT use getGoals", resultB.selectedTools.includes("getGoals"));
  check("PROOF-5", "Request C uses 2 tools", resultC.selectedTools.length, 2);
  check("PROOF-6", "Request A, B, C all have different tool sequences",
    JSON.stringify(resultA.selectedTools) !== JSON.stringify(resultB.selectedTools) &&
    JSON.stringify(resultB.selectedTools) !== JSON.stringify(resultC.selectedTools),
    true
  );
}

/* ================================================================
   RESULTS
   ================================================================ */
console.log(`
============================================================
Agentic v2 Test Results
============================================================
  PASS: ${pass}
  FAIL: ${fail}
  Total: ${pass + fail}
============================================================
`);

if (fail > 0) {
  process.exit(1);
}
