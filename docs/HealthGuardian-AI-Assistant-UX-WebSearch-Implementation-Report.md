# HealthGuardian AI — Assistant UX & Web Search Implementation Report

**Date:** 2026-08-27  
**Phase:** Phase 9 — Redesign AI Assistant Chat UX & Web Search Integration  
**Status:** COMPLETED & VALIDATED (Production Build PASS, ESLint PASS, 229/229 Automated Tests PASS)

---

## 1. Current UX Problems Identified

Prior to Phase 9, the AI Assistant interface suffered from several user experience and presentation deficiencies:
- **Exposed Implementation Metadata:** Internal provider routing details, raw tool step counts (`"0 tool step(s) · offline reasoning"`), and model information were visible to ordinary users.
- **Unstructured Text Output:** Responses were rendered as single blocks of plain text without rich typographic hierarchy (headings, formatted lists, tables, blockquotes).
- **No External Web Search:** The assistant could not reference external public health guidelines (e.g. WHO physical activity recommendations or CDC sleep duration benchmarks) without user-provided text.
- **Lack of Source Attribution:** When general health facts were stated, there was no mechanism to provide verified, clickable citations.
- **Cluttered Composer:** The input area lacked a clear toggle for public web guidelines vs. private-only health record inquiries.

---

## 2. New Chat Architecture

The Assistant page was redesigned around a modern conversational layout inspired by the interaction patterns of leading AI products (Claude / ChatGPT):

### Key Structural Improvements:
- **Header:** Clean `HealthGuardian AI` title with subtitle *"Your health information assistant"*, a subtle *"Controlled Agentic"* badge, contextual help tooltip, and a *"New chat"* action button.
- **Centered Chat Column:** Responsive container (`max-w-3xl mx-auto`) providing a comfortable reading width across desktop, tablet, and mobile viewports.
- **User Message Bubble:** Sleek right-aligned rounded container (`bg-primary text-primary-foreground`, `rounded-2xl rounded-tr-xs shadow-xs px-4 py-2.5`).
- **Assistant Message Bubble:** Left-aligned response container with a dedicated Bot avatar, rendering clean, sanitized markdown via [`MarkdownContent.tsx`](file:///d:/healthguardian-ai/frontend/src/features/agent/MarkdownContent.tsx).
- **Starter Prompt Chips:** Six interactive starter cards in the empty state covering weekly summaries, sleep trends, lab reports, active goals, physical activity guidelines, and daily hydration advice.
- **Pending Action Cards:** Propose actions (e.g. creating a health goal or setting a reminder) render interactive confirmation cards with *"Yes, proceed"* and *"Cancel"* buttons.

---

## 3. Web Search Architecture

A bounded, privacy-aware web search subsystem was integrated into HealthGuardian AI:

```
User Question (with Web Search ON)
         │
         ▼
Agentic V2 Dynamic Classifier
         │
         ├──► Private Data Question  ──► getHealthContext / getDailyCheckins / getGoals
         ├──► Public Health Guideline ──► webSearch Tool (Sanitized Query)
         └──► Hybrid Inquiry          ──► Private Health Tool + webSearch Tool
         │
         ▼
Backend AI Boundary (/api/ai/search)
         │
         ├──► 1. Query Privacy Sanitization (Strips personal vitals & pronouns)
         ├──► 2. Live Public Health Search (DuckDuckGo Instant Answers API)
         └──► 3. Curated Health Knowledge Fallback (WHO, CDC, AHA, Sleep Foundation)
         │
         ▼
Structured Sources + Grounded Answer Synthesis
         │
         ▼
Frontend Safe Rendering (Markdown + SourceCardList + SafeActivityPanel)
```

---

## 4. Health Data vs. Web Data Separation

HealthGuardian AI strictly separates private account records from external public web information:
- **Private Health Records:** Analyzed using authorized tools (`getHealthContext`, `calculatePersonalBaseline`, `getGoals`, `getMedicalReport`). Private records represent the historical ground truth for the authenticated user.
- **Public Web Information:** Retrieved through the read-only `webSearch` tool. Web sources provide general educational guidelines (e.g. WHO recommendation of 150–300 minutes of exercise/week) and are explicitly cited.
- **Non-Diagnostic Rule:** Web search results are never used to synthesize a medical diagnosis or override the user's verified lab values.
- **Hybrid Comparisons:** When a user asks *"How does my exercise compare with public guidelines?"*, the agent calls `getHealthContext` for the user's logged activity and `webSearch` for the public standard, clearly presenting both without confusing private facts with public advice.

---

## 5. Agent Tool Selection Behavior

The `webSearch` tool is registered in [`frontend/src/features/agent/tools.ts`](file:///d:/healthguardian-ai/frontend/src/features/agent/tools.ts) with strict read-only parameters:
- **Name:** `webSearch`
- **Read/Write:** `read`
- **Authorization Required:** `true`
- **Requires Confirmation:** `false`
- **Schema:** `z.object({ query: z.string().min(1).max(200) }).strict()`

### Dynamic Selection Scenarios:
1. *"How has my sleep changed this week?"* $\longrightarrow$ Selects `getHealthContext` only (Web search NOT called).
2. *"What are the latest physical activity guidelines for adults?"* $\longrightarrow$ Selects `webSearch` only (Private health data NOT queried).
3. *"How does my sleep compare with public recommendations?"* $\longrightarrow$ Selects `getHealthContext` and `webSearch`.
4. *Web Search toggle OFF:* The `webSearch` tool is omitted from the prompt catalogue, ensuring strict local-only reasoning.

---

## 6. Search Progress UX

While the assistant is processing a request:
- **Private Health Query:** Displays `"Checking your records…"` with a pulsing loader.
- **Web Search Active:** Displays `"Searching the web & checking records…"` during retrieval.
- **Synthesis:** Displays `"Thinking…"` while finalizing the grounded response.
- Once completed, the loading state seamlessly transitions into the structured message bubble.

---

## 7. Source Display & Citations

When web search is used, [`SourceCardList.tsx`](file:///d:/healthguardian-ai/frontend/src/features/agent/SourceCardList.tsx) renders a collapsed pill at the bottom of the assistant response:
- **Summary Pill:** `🌐 Web search used · X sources` with an expand/collapse chevron.
- **Expanded Source Cards:**
  - Source title (e.g. *"WHO Guidelines on Physical Activity and Sedentary Behaviour"*)
  - Domain badge (e.g. `who.int`, `cdc.gov`, `heart.org`, `sleepfoundation.org`)
  - Concise snippet
  - Direct *"Open source ↗"* link (`target="_blank" rel="noopener noreferrer"`)
- **Zero Hallucination:** Only sources actually returned by the search tool are rendered.

---

## 8. Privacy Handling & Query Minimization

Before any query is transmitted to external search providers:
- **Pronoun Stripping:** Personal identifiers and pronouns (`"my"`, `"I"`, `"me"`, `"patient"`) are removed.
- **Vitals Stripping:** Numeric medical readings with units (e.g. `"186 mg/dL"`, `"140/90 mmHg"`) are stripped from external search queries.
- **Query Generalization:** Queries are reduced to generalized health topic keywords (e.g. `"blood glucose target ranges"`, `"daily physical activity recommendations"`).
- Private user records remain strictly within the authorized Firebase UID boundary.

---

## 9. Prompt-Injection & Untrusted Data Protection

- **Untrusted Web Content:** External search snippets and web text are labeled as untrusted data within the system prompt and cannot modify agent rules, change the user's UID, or trigger unauthorized write operations.
- **Safe Output Sanitizer:** [`sanitizeAssistantReply()`](file:///d:/healthguardian-ai/frontend/src/features/agent/agent.ts#L872) intercepts and neutralizes raw XML tags (`<tool_call>`, `<tool_response>`), raw JSON action strings (`{"action":"tool",...}`), or internal safety tokens before rendering.

---

## 10. Provider Detail & Trace Hiding

- **Default State:** All provider names (OpenRouter, Groq, NVIDIA, Mistral, SambaNova, Cohere, Cerebras), model IDs, and HTTP status codes are completely hidden from standard chat bubbles.
- **Safe Activity Transparency:** [`SafeActivityPanel.tsx`](file:///d:/healthguardian-ai/frontend/src/features/agent/SafeActivityPanel.tsx) provides an optional collapsed drawer showing only high-level safe metadata (e.g. `Activity (2 steps)`, list of authorized tool names, completion status).

---

## 11. Mobile & Desktop UX

- **Responsive Viewport:** Full support for narrow mobile screens down to 320px width without horizontal overflow.
- **Touch-Friendly Controls:** Large hit targets for the Web Search toggle, starter prompt chips, and send button.
- **Sticky Composer:** Bottom-fixed input container with glassmorphism gradient background ensuring visibility across all scroll positions.
- **Comfortable Desktop Reading Width:** Max reading width capped at `max-w-3xl` for effortless scanning.

---

## 12. Accessibility & Usability

- **Keyboard Navigation:** Full keyboard support (`Enter` to submit, `Shift + Enter` for multiline input).
- **ARIA Attributes:** `aria-label="Send message"`, `aria-pressed={webSearchEnabled}`, `aria-expanded={open}` on expandable drawers and source pills.
- **Semantic Contrast:** High contrast text tokens matching light and dark themes.

---

## 13. Files Created & Modified

### New Files Created:
1. `backend/web-search.js` — Privacy-aware backend search service with DuckDuckGo API and curated health fallbacks.
2. `frontend/src/services/ai/web-search.ts` — Frontend client interface for `/api/ai/search`.
3. `frontend/src/features/agent/MarkdownContent.tsx` — Clean, safe Markdown renderer.
4. `frontend/src/features/agent/SourceCardList.tsx` — Collapsible source cards and citation viewer.
5. `frontend/src/features/agent/SafeActivityPanel.tsx` — Collapsible transparency activity panel.
6. `frontend/src/features/agent/ChatComposer.tsx` — Sticky chat composer with Web Search toggle.
7. `backend/test-assistant-ux-websearch.js` — Automated test suite for Phase 9 features.

### Files Modified:
1. `backend/server.js` — Added `POST /api/ai/search` endpoint.
2. `frontend/src/features/agent/tools.ts` — Added `webSearch` tool definition.
3. `frontend/src/features/agent/action-validation.ts` — Added `webSearch` schema validation.
4. `frontend/src/features/agent/agent.ts` — Added `webSearchEnabled` option, source tracking, and sanitized output metadata.
5. `frontend/src/routes/app/assistant.tsx` — Complete redesign of the AI Assistant chat page.
6. `backend/test-action-validation.js` — Updated mock tools registry with `webSearch`.

---

## 14. Verification & Automated Test Results

| Test Suite | Result | Assertions / Modules |
|---|---|---|
| `test-assistant-ux-websearch.js` | **PASS** | 38 / 38 assertions pass |
| `test-agentic-v2.js` | **PASS** | 38 / 38 assertions pass |
| `test-multi-provider-router.js` | **PASS** | 18 / 18 assertions pass |
| `test-adaptive-v2.js` | **PASS** | 62 / 62 assertions pass |
| `test-f001-regression.js` | **PASS** | 48 / 48 assertions pass |
| `test-action-validation.js` | **PASS** | 11 / 11 assertions pass |
| `test-ai-router-mocks.js` | **PASS** | 7 / 7 assertions pass |
| `test-synthetic-replay.js` | **PASS** | 7 / 7 assertions pass |
| **Total Automated Assertions** | **PASS** | **229 / 229 PASS (100% Green)** |

---

## 15. Build & Lint Verification

- **Production Build (`npm run build`):** **Exit Code 0** (2,621 modules transformed in 2.62s).
- **ESLint (`npm run lint`):** **Exit Code 0** (0 errors).

---

## 16. Remaining Boundaries & Safe Limitations

1. **Non-Diagnostic Scope:** The assistant provides lifestyle summaries, habit insights, and educational guidance; it never diagnoses medical conditions or prescribes medications.
2. **Emergency Gate Precedence:** For acute conditions (e.g. severe chest pain or shortness of breath), the deterministic emergency safety gate triggers instantly without calling web search or external AI.
3. **Write Actions:** All mutations (goal creation, notifications, support requests) require explicit user confirmation before execution.

---

*Report certified: HealthGuardian AI Phase 9 Assistant UX & Web Search System successfully implemented, verified, and validated.*
