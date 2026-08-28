# HealthGuardian AI AI Integration Report

Date: 2026-08-26

## Root Cause

The previous AI integration failure was caused by [backend/server.js](../backend/server.js) implementing `/api/ai/complete` as a fixed unavailable-response stub. It reported provider configuration but never called the existing server-side provider router. A second configuration issue was that `backend/.env` selected unavailable model IDs for Groq and Cerebras:

- Groq: `llama-3.3-70b-versatile` returned HTTP 404 for this account.
- Cerebras: `llama-3.3-70b` returned HTTP 404 for this account.

The active account model listing verified these replacements:

- OpenRouter: `openrouter/free`
- Groq: `openai/gpt-oss-120b`
- Cerebras: `gpt-oss-120b`

## Environment Variables Used

Names only; values are intentionally excluded.

- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `CEREBRAS_API_KEY`
- `OPENROUTER_MODEL`
- `GROQ_MODEL`
- `CEREBRAS_MODEL`

Provider credentials remain in `backend/.env` only. They were removed from `frontend/.env.example`; no `VITE_*` secret variables were introduced.

## Provider Connectivity

Each diagnostic used one tiny synthetic prompt: `Return a short confirmation that the provider is reachable.` No health records, reports, names, or personal data were sent.

| Provider | Model | Result | Evidence |
|---|---|---|---|
| OpenRouter | `openrouter/free` | CONNECTED | HTTP 200; valid chat completion; live router completion succeeded. |
| Groq | `openai/gpt-oss-120b` | CONNECTED on direct retry; transient diagnostic ERROR observed | Direct HTTP 200 with one valid completion. A subsequent router diagnostic encountered a transient non-success after retries. |
| Cerebras | `gpt-oss-120b` | QUOTA | HTTP 402 from the account; model listing confirmed the model exists. |

The live `/api/ai/complete` route returned a valid OpenRouter response with `attempted: ["openrouter"]`, proving normal priority and early stop behavior.

## Models Actually Selected

The backend defaults now select the verified models above, while environment overrides remain supported. OpenRouter remains first priority and uses `openrouter/free` by default.

## Provider Fallback Order

Implemented in [backend/ai-provider-router.js](../backend/ai-provider-router.js):

1. OpenRouter
2. Groq
3. Cerebras
4. Application deterministic/offline fallback after all providers fail

Requests are sequential. A successful provider stops the chain. The provider router does not call providers concurrently.

## Retry and Timeout Behavior

- Provider timeout: 25 seconds.
- Maximum attempts per provider: two total attempts, meaning one retry.
- Retryable failures: authentication/quota statuses, HTTP 5xx, timeout, network error, and malformed response.
- No infinite retry loop.
- Error output contains provider/status categories only; credentials are not logged.

## Tool Calling and Structured Output

The current agent uses application-level JSON action instructions (`tool`, `ask`, `answer`, `propose`) rather than native provider tool schemas. The application validates the action shape, checks the tool registry, executes tools against the authenticated UID, feeds observations back, and bounds the loop at five iterations. Native provider tool-calling capability is not currently implemented.

Structured output is requested only through the existing `json` flag as `response_format: { type: "json_object" }`. There is no Zod validation of provider-generated structured payloads yet. This remains a risk for structured extraction workflows.

## Agentic Loop Behavior

Assessment: **PARTIALLY AGENTIC**.

[frontend/src/features/agent/agent.ts](../frontend/src/features/agent/agent.ts) performs intent classification, proposes relevant tools, executes one tool at a time, evaluates model actions, supports additional iterations, stops at a maximum, and records a trace. Mutating tools require confirmation. The implementation is not fully capability-aware because the provider request still uses a prompt-defined JSON protocol rather than native tool schemas, and the model receives a broad tool catalogue.

## Adaptive Intelligence Architecture

Added pure application-code evidence functions in [frontend/src/features/healthRisk/engine.ts](../frontend/src/features/healthRisk/engine.ts):

- personal median baseline
- recent median and mean
- deviation from personal baseline
- rate of change
- direction
- evidence count
- missing-data ratio
- confidence

`calculatePersonalBaseline` uses the user’s own ordered check-ins and does not use an LLM for arithmetic. `calculateAdaptiveEvidence` evaluates the available numeric dimensions. A new `calculatePersonalBaseline` agent tool exposes this evidence to the agent, and trend/analysis plans include it.

This is a foundation, not a replacement of the existing risk engine. The existing `hg-rules-1.0.0` rules remain in place for deterministic safety and pattern guardrails. A full contextual multi-factor adaptive classifier and UI presentation were not implemented in this phase.

## Remaining Fixed Safety Guardrails

The existing safety prompt still prohibits diagnosis, prescribing, medication changes, certainty claims, instruction disclosure, and treating report text as instructions. Tool authorization continues to use the signed-in UID rather than a model-provided UID. Deterministic risk calculations remain local and separate from LLM output.

The live prompt-injection smoke test returned a refusal: `I’m sorry, but I can’t diagnose or claim you have a condition.` It used OpenRouter and executed zero tools.

A dedicated deterministic emergency response path was not established from the reviewed agent implementation. Emergency cases remain a required follow-up.

## Lint Result

- Focused lint for changed files: PASS after formatting.
- Full repository lint: not re-run to completion in this phase; the prior baseline had widespread Prettier/CRLF diagnostics outside this change.

## Build Result

PASS. `npm run build` completed successfully. Existing Vite warnings remain for large chunks: approximately 1.58 MB main client chunk and 1.26 MB PDF worker.

## Security Findings

- Provider credentials are read server-side from environment variables.
- No provider credential values were added to source or reports.
- Rebuilt client asset scan: no provider-key-looking matches found.
- Frontend provider adapter files still exist as unused source modules and reference `process.env` keys; they should be removed from the client-facing source tree or made server-only in a future hardening pass.
- The backend status endpoint exposes configured booleans and model names, not secret values.
- Credentials pasted into the conversation should be rotated after testing.

## Tests Executed

- Provider model discovery for Groq and Cerebras: PASS; supported IDs identified.
- OpenRouter minimal request: PASS.
- Groq minimal request with `openai/gpt-oss-120b`: PASS on direct retry.
- Cerebras minimal request: QUOTA/HTTP 402.
- New `npm run test:ai-providers` diagnostic: executed; OpenRouter connected, Cerebras quota, Groq transient error observed.
- Live `/api/ai/complete`: PASS through OpenRouter; one provider attempted.
- Live AI prompt-injection smoke test: PASS; refusal, zero tool steps.
- Client secret scan: PASS; no credential-looking values found.
- Production build: PASS.
- Focused lint: PASS.

## Remaining Blocked Tests

- Native provider tool-calling tests.
- Structured-output schema validation tests.
- Mocked fallback tests for OpenRouter -> Groq -> Cerebras -> local fallback.
- Complete synthetic dataset replay and AI grounding with seeded records.
- Emergency deterministic safety cases.
- Cross-user Firebase security tests.
- Full offline/PWA tests.
- Large-data performance tests.

## Remaining Risks

1. Cerebras is quota-limited for the tested account; fallback is available but that provider cannot currently serve traffic.
2. Groq connectivity is valid but showed transient diagnostic instability and needs repeated monitoring.
3. The agent protocol is prompt-based JSON, not native tool calling, and structured output is not schema-validated.
4. The adaptive layer is currently exposed to the agent but is not yet the primary dashboard/risk presentation.
5. Full repository lint still has the pre-existing formatting baseline outside the touched slice.
6. Provider credentials disclosed during testing should be revoked and replaced.

## Final Assessment

The previous provider integration failure is fixed at the backend boundary. OpenRouter now serves minimal real completions securely, Groq is configured with an account-supported model, and Cerebras is correctly identified as quota-limited. The implementation is **READY FOR FURTHER AI VALIDATION**, but not ready for a final release assessment until fallback mocking, structured validation, deterministic emergency handling, adaptive end-to-end tests, and credential rotation are complete.
