# HealthGuardian AI Test Report

## 1. Executive Summary

This is a test-only baseline assessment performed on 2026-08-26 against the repository implementation and the master synthetic dataset. Application code was not modified. The supplied account was used only for authentication and read-only smoke checks; it was not treated as one of the synthetic dataset users.

The production build completes, backend health endpoints respond, authentication succeeds, protected routes load, and the empty dashboard does not fabricate health data. The baseline is **NOT READY** for a final validation claim because the complete synthetic workflow was not executed in isolated accounts, the live account was not populated with the 14-day dataset, Firebase cross-user/rules tests were not directly exercised, and the AI provider status reports all three providers configured while the assistant returned the unavailable/offline path.

Important static findings include deterministic same-day check-in overwrite semantics, no application service worker, incomplete export/deletion coverage, a client-visible provider implementation surface, and a mismatch between the visible report contract and WEBP acceptance.

## 2. Environment

- OS: Windows
- App URL: `http://localhost:3000`
- Framework/build: TanStack Router + React 19 + Vite
- Backend: Express with Vite middleware in development
- Data: Firebase Authentication/Firestore with persistent local cache; IndexedDB for raw documents
- Account used: supplied test account; credential value intentionally omitted
- Date tested: 2026-08-26

## 3. Repository Architecture Summary

- Entry and route tree: [frontend/src/router.tsx](../frontend/src/router.tsx), [frontend/src/routeTree.gen.ts](../frontend/src/routeTree.gen.ts)
- Auth: [frontend/src/services/firebase/auth.ts](../frontend/src/services/firebase/auth.ts)
- Firebase configuration and persistent cache: [frontend/src/services/firebase/config.ts](../frontend/src/services/firebase/config.ts)
- User-scoped repositories and deletion: [frontend/src/services/firebase/repositories.ts](../frontend/src/services/firebase/repositories.ts)
- Rules: [docs/Firebase-rules.js](Firebase-rules.js)
- Risk engine: [frontend/src/features/healthRisk/engine.ts](../frontend/src/features/healthRisk/engine.ts), [frontend/src/core/constants/health.ts](../frontend/src/core/constants/health.ts)
- OCR/local reports: [frontend/src/services/ocr/ocr.ts](../frontend/src/services/ocr/ocr.ts), [frontend/src/services/localStorage/documents.ts](../frontend/src/services/localStorage/documents.ts), [frontend/src/routes/app/reports.tsx](../frontend/src/routes/app/reports.tsx)
- Agent/tools: [frontend/src/features/agent/agent.ts](../frontend/src/features/agent/agent.ts), [frontend/src/features/agent/tools.ts](../frontend/src/features/agent/tools.ts)
- Provider routing: [frontend/src/services/ai/AIProviderRouter.ts](../frontend/src/services/ai/AIProviderRouter.ts), [backend/server.js](../backend/server.js)
- Validation: [frontend/src/core/validation/schemas.ts](../frontend/src/core/validation/schemas.ts)
- PWA manifest: [frontend/public/manifest.webmanifest](../frontend/public/manifest.webmanifest)

## 4. Test Dataset Used

Source of truth: [docs/HealthGuardian-AI-Merged-Test-Dataset.md](HealthGuardian-AI-Merged-Test-Dataset.md).

Formal dataset scope: 161 cases: 14 check-in, 13 risk, 24 report/OCR, 34 AI, 10 notification, 6 specialist, 17 privacy, 14 edge, 18 security, 8 performance, and 3 PWA additions. No formal case was marked fully executed because isolated synthetic accounts and the complete seeded datasets were not available through the UI without mutating the supplied account.

## 5. Functional Test Results

| Test | Result | Evidence |
|---|---|---|
| Runtime start and route smoke | PASS | App loaded at `/auth`; protected dashboard and all listed app routes navigated successfully. |
| Backend health | PASS | `/health` and `/api/health` returned HTTP 200 with healthy status. |
| Authentication login | PASS | Supplied account reached `/app/dashboard`. |
| New-user dashboard state | PASS | Displayed `No check-ins yet`; no score or pattern fabricated. |
| Protected-route behavior | BLOCKED | Authenticated route access verified; unauthenticated redirect and post-logout reload were not executed to avoid altering the supplied session. |
| Cross-user isolation | BLOCKED | Requires two isolated synthetic accounts and direct Firestore attempts. |

## 6. Daily Check-in Results

Static implementation supports blank values as `null`, validates numeric ranges, requires BP systolic and diastolic together, and uses a date-derived document ID. This satisfies the blank-not-zero design for normal saves. The full TC-CHK set was BLOCKED because the supplied account was not seeded with the synthetic profile/data.

## 7. Health History Results

Static implementation orders check-ins by date descending and filters chart points to numeric values, avoiding interpolation. The table is limited to 30 displayed rows while queries can retrieve 120. Full persistence, exact-value, gap, and reload cases were BLOCKED.

## 8. Risk/Pattern Results

`hg-rules-1.0.0` is defined and deterministic in local code. Thresholds are explicit: trend minimum 3 check-ins, sleep decline 1 hour across four entries, repeated symptoms 3 within 14 days, elevated BP at 130/85, high BP at 140/90, elevated fasting glucose at 100 mg/dL, high at 126 mg/dL, and other thresholds in [frontend/src/core/constants/health.ts](../frontend/src/core/constants/health.ts). The engine ignores nonnumeric values and only uses verified lab results for lab patterns.

Risk cases TC-RISK-001 through TC-RISK-013 were BLOCKED as execution cases. Static concern: symptom recency uses `Date.now()` rather than the dataset's reference date, so historical synthetic dates can be excluded from repeated-symptom analysis when run today.

## 9. Medical Report Results

Static implementation stores raw files in IndexedDB and stores only metadata/results in Firestore. It validates MIME, nonzero size, and a 15 MiB maximum. PDF text extraction is local; image OCR uses Tesseract locally. Raw-file network verification and all upload boundary cases were BLOCKED.

Finding: `ALLOWED_MIME` accepts `image/webp`, while the visible form contract says `PDF, PNG or JPEG`. This is an implementation/UI inconsistency.

## 10. OCR Results

Candidates default to `userVerified: false`; confirmation writes verified results and updates report verification status. Printed ranges and original textual values are preserved by the parser where matched. The parser de-duplicates by test name with first occurrence winning, which can hide repeated/conflicting same-name values. OCR quality, correction, multi-page, malformed-file, and prompt-injection cases were BLOCKED.

## 11. AI Grounding Results

The agent has bounded intent classification, UID-bound tools, tool observations, a maximum of five iterations, and a safety system prompt. Tool context excludes profile names and only exposes verified medical results through the dedicated tool.

Live TC-AI-027-style prompt-injection smoke test: **PASS for observed response**. The assistant returned a non-diagnostic unavailable/offline response and did not claim a severe condition. This was not a provider-backed grounding test.

All other formal grounding cases were BLOCKED because the synthetic history/report corpus was not loaded.

## 12. AI Safety Results

Static prompt rules prohibit diagnosis, prescribing, medication changes, system-instruction disclosure, and treating document text as instructions. The live injection smoke test did not bypass those visible constraints. Emergency behavior was not fully verified; no dedicated deterministic emergency safety path was established from the reviewed agent code. High-severity emergency tests were BLOCKED.

## 13. Agentic AI Assessment

**PARTIALLY AGENTIC.** Evidence: [agent.ts](../frontend/src/features/agent/agent.ts) classifies intent, selects tools, executes tool results, sends observations back to a model, permits another tool action, bounds iterations, and records a trace. However, the running backend endpoint currently returns an unavailable response instead of invoking providers, and deterministic planned tools are only a hint/fallback rather than an independently complete response planner.

## 14. AI Provider Fallback Results

The frontend router attempts providers sequentially in OpenRouter, Groq, Cerebras order and then uses a deterministic fallback. Provider adapters use 25-second abort timers and classify timeout/network/rate-limit/server/malformed failures as retryable. No mocked provider-failure execution was performed. The backend currently reports all three providers configured, but `/api/ai/complete` returns a fixed unavailable response instead of calling them. Result: **FAIL against claimed live provider behavior; fallback integration BLOCKED.**

## 15. API Secret Exposure Results

**UNKNOWN / HIGH RISK FOR REVIEW.** Source provider adapters under `frontend/src/services/ai/` reference `process.env` API keys and contain Authorization headers, although a server-only adapter also exists. The built-asset scan did not reveal an actual key value, but the client source/build boundary needs explicit bundler verification. `/api/ai/status` exposes provider configured booleans and model names, not key values. No secret values are reproduced here.

## 16. Firebase Security Results

Rules require authentication and match the requested UID for `/users/{userId}` and all descendants. Repository paths are UID-scoped. User root creation sets `role: user` and `accountStatus: active`.

Static gap: rules permit an owner to update/delete every field in their own root document, including `role` and `accountStatus`; there is no field-level restriction preventing self-escalation. Direct User A/User B, unauthenticated, and privilege-escalation tests were BLOCKED, but the rule text is sufficient to report a **HIGH/CRITICAL security defect candidate**.

## 17. Notification Results

Notifications are event-driven while the app is open, use generic browser text, and deduplicate per UID/factor/day via localStorage. Permission denial has an in-app fallback. No background FCM/server push exists. Full trigger, duplicate, permission, and lock-screen cases were BLOCKED.

## 18. Specialist Guidance Results

Route and empty state loaded. Static code indicates guidance is derived from local patterns and broad specialties. Trigger mapping and insufficient-data cases were BLOCKED.

## 19. Support Results

Support form loaded with type and priority fields, Zod validation, UID-scoped persistence, and status display. Create/reload/status/isolation cases were BLOCKED.

## 20. Privacy Results

Profile UI, export, health-data deletion, account deletion, and sign-out controls loaded. Account deletion reauthenticates with the supplied password before deleting the Firebase user. Health-data deletion removes Firestore subcollections, reports/results, sessions/messages, and local raw documents.

Finding: the deletion path does not call the IndexedDB `cacheClear(uid)` helper or clear the `hg_pattern_alerts` localStorage dedupe state. This may leave user-derived local cache/dedupe data after “all health data” deletion. Export includes profile, health profile, check-ins, reports, and goals but omits notifications, risk assessments, guidance, support requests, sessions/messages, and health records.

## 21. PWA/Offline Results

Firestore persistent local cache is configured and the check-in repository uses idempotent date IDs. However, no application service-worker registration or service-worker file was found under the frontend source/public tree. Manifest icons exist as `pwa-192.png` and `pwa-512.png`; an explicit `apple-touch-icon` manifest member was not found, though `apple-touch-icon.png` exists in public. Offline install/sync/raw-file network tests were BLOCKED.

## 22. Input Validation Results

Zod schemas enforce ranges for most numeric fields and lengths for names, notes, profile emergency notes, report metadata, goals, and support. React renders user text as text nodes, with no reviewed `dangerouslySetInnerHTML` path. Runtime edge/security cases were BLOCKED. Static concern: `goalSchema` allows `targetValue` to become `null`, while the goals UI computes progress using a falsy guard; behavior is unspecified rather than clearly invalid.

## 23. Performance Results

Build duration observed: approximately 25.26 seconds. Vite reported a minified client chunk of approximately 1.58 MB and a PDF worker of approximately 1.26 MB, both over the 500 KB warning threshold. Dataset scale/performance cases were not executed. No memory or interaction timings were collected.

## 24. Branding/PWA Icon Results

HealthGuardian branding is present in route titles, headers, manifest name, favicon files, Apple icon file, and PWA icon files. No Lovable/default logo text was found in the targeted source/public audit. Manifest references `/pwa-192.png` and `/pwa-512.png`. Install/splash verification was BLOCKED.

## 25. Defect List

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| HG-001 | CRITICAL candidate | Firestore owner rule permits self-update of `role` and `accountStatus`; privilege escalation is not field-restricted. | [Firebase-rules.js](Firebase-rules.js) |
| HG-002 | HIGH | Same-date check-ins use a deterministic date document ID with merge, so later submissions silently replace fields rather than rejecting or recording a conflict. | [repositories.ts](../frontend/src/services/firebase/repositories.ts) |
| HG-003 | HIGH | “Delete all health data” does not clear IndexedDB cache or notification dedupe localStorage. | [repositories.ts](../frontend/src/services/firebase/repositories.ts), [documents.ts](../frontend/src/services/localStorage/documents.ts) |
| HG-004 | HIGH | JSON export omits several stored data classes, despite UI wording “Export everything”. | [settings.tsx](../frontend/src/routes/app/settings.tsx) |
| HG-005 | HIGH | Backend `/api/ai/complete` reports configured providers but returns a fixed unavailable response and does not invoke the provider router. | [backend/server.js](../backend/server.js), [AIProviderRouter.ts](../frontend/src/services/ai/AIProviderRouter.ts) |
| HG-006 | HIGH candidate | Provider adapters and API-key references exist in frontend source; client exposure is not conclusively proven from the built scan and needs bundler/runtime verification. | [OpenRouterProvider.ts](../frontend/src/services/ai/OpenRouterProvider.ts), [providers.server.ts](../frontend/src/services/ai/providers.server.ts) |
| HG-007 | MEDIUM | WEBP is accepted by validation while the report UI says only PDF, PNG, or JPEG. | [documents.ts](../frontend/src/services/localStorage/documents.ts), [reports.tsx](../frontend/src/routes/app/reports.tsx) |
| HG-008 | MEDIUM | No service worker was found; offline PWA install/shell/synchronization claims are not implemented or not discoverable. | [manifest.webmanifest](../frontend/public/manifest.webmanifest) |
| HG-009 | MEDIUM | Historical synthetic risk runs can produce different repeated-symptom results because the window is based on current wall-clock time. | [engine.ts](../frontend/src/features/healthRisk/engine.ts) |
| HG-010 | MEDIUM | OCR de-duplicates same-name results by keeping the first occurrence, which can hide conflicting repeated values. | [ocr.ts](../frontend/src/services/ocr/ocr.ts) |
| HG-011 | LOW | Repository-wide lint fails on widespread Prettier/CRLF diagnostics. | `npm --prefix frontend run lint` |
| HG-012 | LOW | Production build emits large-chunk performance warnings. | `npm run build` |

## 26. Critical Findings

- Firestore rules do not visibly protect role/accountStatus from owner mutation. This must be tested against deployed rules before any release.
- Raw provider key exposure remains unresolved; treat as a release blocker until the client bundle and network behavior prove secrets remain server-only.
- Emergency safety, document prompt injection, OCR verification, cross-user isolation, and deletion retention were not fully executed.

## 27. Recommended Fix Priority

1. Restrict immutable/security-sensitive Firestore fields with field-level rules and execute cross-user/privilege tests.
2. Make the backend provider endpoint call the intended server-side router or explicitly mark AI unavailable; verify keys are never bundled.
3. Define and implement deletion/export scope, including all derived records and browser-local caches.
4. Define duplicate-date conflict policy and make the risk engine accept an explicit evaluation date.
5. Add a real service worker or remove offline/PWA claims; reconcile WEBP behavior and manifest Apple icon metadata.
6. Add automated tests for OCR verification gates, safety cases, provider fallback, and exact data-integrity round trips.
7. Address the existing lint baseline and split large production chunks.

## 28. Untested / Blocked Tests

All 161 formal dataset cases remained blocked as complete end-to-end cases because isolated synthetic accounts were not created and the supplied account was not seeded with the master data. Specifically blocked: full check-in persistence, 14-day history, every risk oracle, report/OCR files, provider mocking, Firebase denial tests, deletion verification, offline synchronization, large-scale performance, and most AI grounding/safety cases.

## 29. Evidence and Source Locations

Observed runtime evidence:

- `/auth` rendered sign-in page and safety disclaimer.
- Successful login reached `/app/dashboard`.
- Dashboard showed `No check-ins yet` and no fabricated score/pattern.
- All listed protected routes navigated and rendered their expected headers/empty states/forms.
- Injection smoke test returned a bounded offline response without diagnosis.
- `/health` and `/api/health` returned HTTP 200.
- `/api/ai/status` returned all three providers as configured.

Repository evidence is linked throughout this report. No application source or behavior was changed.

## 30. Final Readiness Assessment

**NOT READY** for final validation or production readiness. The implementation has a coherent privacy-oriented structure and several useful safety/data-integrity controls, but unresolved security candidates, a nonfunctional live AI backend boundary, incomplete PWA implementation, deletion/export gaps, and blocked end-to-end coverage prevent a stronger readiness classification.

## Final Summary Table

| Category | Count |
|---|---:|
| Formal dataset tests | 161 |
| Passed formal tests | 0 |
| Failed formal tests | 0 |
| Blocked formal tests | 161 |
| Not executed | 161 |
| Separate runtime/static smoke checks | 14 |

Scores are not assigned for blocked formal suites. The available smoke result is: build PASS, backend health PASS, authentication PASS, protected-route navigation PASS, empty-state safety PASS, AI injection smoke PASS, AI provider integration FAIL, lint FAIL, and security/PWA/data lifecycle unresolved.
