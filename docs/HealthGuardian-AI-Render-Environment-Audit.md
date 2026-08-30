# HealthGuardian AI — Render Environment Audit Report
**Phase 12B — Environment Configuration & Secret Isolation Audit**
**Date**: 2026-08-30
**Classification**: PUBLIC / AUDIT COMPLIANT (0 Secrets Exposed)

---

## 1. Executive Summary

A comprehensive audit of the HealthGuardian AI repository was conducted to identify all environment variables across backend services, frontend builds, AI routing layers, authentication providers, and local tooling.

Key Findings:
- **7 AI Provider Secret Keys** are strictly confined to the backend server runtime (`backend/.env` / Render server environment) and never bundled into client assets.
- **6 Firebase Client Variables** are public client configurations consumed by the Firebase Web SDK at build time.
- **Local Secret Export** is preserved in a local-only file (`render-env-values.local.txt`) that is explicitly excluded from Git in `.gitignore`.
- **Zero Missing Variables**: All runtime and build variables have active, valid local configurations ready for deployment.

---

## 2. Discovered Environment Variables Directory

| Variable Name | Used In | Classification | Required / Optional | Render Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `backend/server.js`, `backend/package.json` | Public (Server) | **Required** | Set to `production` |
| `PORT` | `backend/server.js` | Public (Runtime) | Auto | Render sets this automatically |
| `HOST` | `backend/server.js` | Public (Runtime) | **Recommended** | Set to `0.0.0.0` |
| `OPENROUTER_API_KEY` | `backend/ai-provider-router.js` | **Server Secret** | Optional* | Copy from `render-env-values.local.txt` |
| `GROQ_API_KEY` | `backend/ai-provider-router.js` | **Server Secret** | Optional* | Copy from `render-env-values.local.txt` |
| `NVIDIA_API_KEY` | `backend/ai-provider-router.js` | **Server Secret** | Optional* | Copy from `render-env-values.local.txt` |
| `MISTRAL_API_KEY` | `backend/ai-provider-router.js` | **Server Secret** | Optional* | Copy from `render-env-values.local.txt` |
| `SAMBANOVA_API_KEY` | `backend/ai-provider-router.js` | **Server Secret** | Optional* | Copy from `render-env-values.local.txt` |
| `COHERE_API_KEY` | `backend/ai-provider-router.js` | **Server Secret** | Optional* | Copy from `render-env-values.local.txt` |
| `CEREBRAS_API_KEY` | `backend/ai-provider-router.js` | **Server Secret** | Optional* | Copy from `render-env-values.local.txt` |
| `OPENROUTER_MODEL` | `backend/ai-provider-router.js` | Public (Config) | Optional | Default: `openrouter/free` |
| `GROQ_MODEL` | `backend/ai-provider-router.js` | Public (Config) | Optional | Default: `openai/gpt-oss-120b` |
| `NVIDIA_MODEL` | `backend/ai-provider-router.js` | Public (Config) | Optional | Default: `meta/llama-3.2-11b-vision-instruct` |
| `MISTRAL_MODEL` | `backend/ai-provider-router.js` | Public (Config) | Optional | Default: `mistral-small-latest` |
| `SAMBANOVA_MODEL` | `backend/ai-provider-router.js` | Public (Config) | Optional | Default: `Meta-Llama-3.3-70B-Instruct` |
| `COHERE_MODEL` | `backend/ai-provider-router.js` | Public (Config) | Optional | Default: `command-r-plus-08-2024` |
| `CEREBRAS_MODEL` | `backend/ai-provider-router.js` | Public (Config) | Optional | Default: `gpt-oss-120b` |
| `PROVIDER_COOLDOWN_MS` | `backend/ai-provider-router.js` | Public (Config) | Optional | Default: `60000` (1 min) |
| `PROVIDER_TIMEOUT_MS` | `backend/ai-provider-router.js` | Public (Config) | Optional | Default: `20000` (20s) |
| `VITE_API_URL` | `frontend/.env.example` | Public (Client) | **Recommended** | Set to `/api` (same origin) |
| `VITE_FIREBASE_API_KEY` | `frontend/src/services/firebase/config.ts` | Public (Client) | **Required (Auth)** | Copy from `render-env-values.local.txt` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `frontend/src/services/firebase/config.ts` | Public (Client) | **Required (Auth)** | Copy from `render-env-values.local.txt` |
| `VITE_FIREBASE_PROJECT_ID` | `frontend/src/services/firebase/config.ts` | Public (Client) | **Required (Auth)** | Copy from `render-env-values.local.txt` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `frontend/src/services/firebase/config.ts` | Public (Client) | **Required (Auth)** | Copy from `render-env-values.local.txt` |
| `VITE_FIREBASE_APP_ID` | `frontend/src/services/firebase/config.ts` | Public (Client) | **Required (Auth)** | Copy from `render-env-values.local.txt` |
| `VITE_FIREBASE_MEASUREMENT_ID` | `frontend/src/services/firebase/config.ts` | Public (Client) | Optional | Copy from `render-env-values.local.txt` |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | `frontend/src/services/firebase/config.ts` | Public (Client) | Optional | Optional reCAPTCHA v3 site key |

*\*At least one AI provider key is required for dynamic AI responses; all 7 are configured locally for full fallback resiliency.*

---

## 3. Classification Breakdown

### A. Render Server Environment Variables (Secrets & Server Runtime)
- `NODE_ENV` (`production`)
- `HOST` (`0.0.0.0`)
- `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY`, `MISTRAL_API_KEY`, `SAMBANOVA_API_KEY`, `COHERE_API_KEY`, `CEREBRAS_API_KEY`
- `OPENROUTER_MODEL`, `GROQ_MODEL`, `NVIDIA_MODEL`, `MISTRAL_MODEL`, `SAMBANOVA_MODEL`, `COHERE_MODEL`, `CEREBRAS_MODEL`
- `PROVIDER_COOLDOWN_MS`, `PROVIDER_TIMEOUT_MS`

### B. Render Client Build Variables (Vite Build Time)
- `VITE_API_URL` (`/api`)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

### C. Local-Development-Only Variables
- `CORS_ORIGIN`: Configured for separate `localhost:3000` cross-port development; not needed in production single-server deployment.

### D. Deprecated / Unused Variables Audit
- `VITE_API_URL=http://localhost:3001/api`: Replaced with same-origin `/api` to avoid hardcoded port bindings.

---

## 4. Security & Secret Isolation Audit

1. **Frontend Bundle Secret Scan**:
   - Audited all output chunks in `frontend/dist/assets/*.js`.
   - Verified that `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY`, `MISTRAL_API_KEY`, `SAMBANOVA_API_KEY`, `COHERE_API_KEY`, and `CEREBRAS_API_KEY` do **NOT** appear anywhere in the bundle.
2. **Git Tracking & `.gitignore` Validation**:
   - `render-env-values.local.txt` is explicitly excluded from Git.
   - `.env`, `.env.local`, `.env.*` are excluded from Git.
   - `.env.example` remains tracked as a safe placeholder template.
3. **No Unhandled Errors**:
   - AI status endpoints (`/api/ai/status`, `/api/ai/health`) return provider operational status and model identifiers only; zero credential values are emitted.

---

## 5. Local Validation Run

The automated test script `backend/test-render-env.js` verified:
- All 7 AI provider secrets are present and populated locally.
- All 7 AI provider model names match active router defaults.
- All 6 Firebase client keys are present in local config.
- `render-env-values.local.txt` contains 25 valid key-value pairs.
- 29 / 29 audit assertions passed with 100% success.
