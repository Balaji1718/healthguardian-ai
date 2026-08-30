# HealthGuardian AI — Render Environment Variables Checklist
**Phase 12B Environment Inventory**
*(Safe for public documentation — contains zero secret values)*

This checklist details every environment variable used across HealthGuardian AI, its purpose, classification, and whether it is configured in the local development environment.

---

## Environment Inventory Table

| Variable Name | Configured Locally? | Source File | Classification | Render Status | Default (if omitted) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `backend/package.json` | **Public (Config)** | **Required** | `production` |
| `PORT` | Yes | `backend/server.js` | **Public (Runtime)** | Auto (Render) | `3000` |
| `HOST` | Yes | `backend/server.js` | **Public (Runtime)** | **Recommended** | `0.0.0.0` |
| `OPENROUTER_API_KEY` | **Yes** | `backend/.env` | **Server Secret** | Optional* | None |
| `GROQ_API_KEY` | **Yes** | `backend/.env` | **Server Secret** | Optional* | None |
| `NVIDIA_API_KEY` | **Yes** | `backend/.env` | **Server Secret** | Optional* | None |
| `MISTRAL_API_KEY` | **Yes** | `backend/.env` | **Server Secret** | Optional* | None |
| `SAMBANOVA_API_KEY` | **Yes** | `backend/.env` | **Server Secret** | Optional* | None |
| `COHERE_API_KEY` | **Yes** | `backend/.env` | **Server Secret** | Optional* | None |
| `CEREBRAS_API_KEY` | **Yes** | `backend/.env` | **Server Secret** | Optional* | None |
| `OPENROUTER_MODEL` | Yes | `backend/.env` | **Public (Config)** | Optional | `openrouter/free` |
| `GROQ_MODEL` | Yes | `backend/.env` | **Public (Config)** | Optional | `openai/gpt-oss-120b` |
| `NVIDIA_MODEL` | Yes | `backend/.env` | **Public (Config)** | Optional | `meta/llama-3.2-11b-vision-instruct` |
| `MISTRAL_MODEL` | Yes | `backend/.env` | **Public (Config)** | Optional | `mistral-small-latest` |
| `SAMBANOVA_MODEL` | Yes | `backend/.env` | **Public (Config)** | Optional | `Meta-Llama-3.3-70B-Instruct` |
| `COHERE_MODEL` | Yes | `backend/.env` | **Public (Config)** | Optional | `command-r-plus-08-2024` |
| `CEREBRAS_MODEL` | Yes | `backend/.env` | **Public (Config)** | Optional | `gpt-oss-120b` |
| `PROVIDER_COOLDOWN_MS` | Optional | `backend/ai-provider-router.js` | **Public (Config)** | Optional | `60000` (1 min) |
| `PROVIDER_TIMEOUT_MS` | Optional | `backend/ai-provider-router.js` | **Public (Config)** | Optional | `20000` (20s) |
| `VITE_API_URL` | Yes | `frontend/.env` | **Public (Client Config)** | **Recommended** | `/api` |
| `VITE_FIREBASE_API_KEY` | **Yes** | `frontend/.env` | **Public Client Config** | **Required (Auth)** | None |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** | `frontend/.env` | **Public Client Config** | **Required (Auth)** | None |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** | `frontend/.env` | **Public Client Config** | **Required (Auth)** | None |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | **Yes** | `frontend/.env` | **Public Client Config** | **Required (Auth)** | None |
| `VITE_FIREBASE_APP_ID` | **Yes** | `frontend/.env` | **Public Client Config** | **Required (Auth)** | None |
| `VITE_FIREBASE_MEASUREMENT_ID` | **Yes** | `frontend/.env` | **Public Client Config** | Optional (Analytics) | None |
| `VITE_FIREBASE_APPCHECK_SITE_KEY` | No | `frontend/src/services/firebase/config.ts` | **Public Client Config** | Optional (App Check) | None |
| `CORS_ORIGIN` | Yes | `backend/.env` | **Local Dev Only** | Unneeded in Prod | `http://localhost:3000` |

*\*Note on AI Keys: At least one AI provider key is required for live AI responses. If none are provided, the system gracefully falls back to deterministic rule-based local responses.*
