# HealthGuardian AI — Render Manual Deployment Guide
**Phase 12A Production Deployment Reference**

This guide provides the exact configuration parameters and instructions needed to manually configure and deploy HealthGuardian AI as a single **Render Web Service**.

---

## 1. Service Type
- **Type**: Web Service
- **Runtime**: Node
- **Environment**: Node.js (`>= 20.0.0`, recommended `22.x`)

---

## 2. Repository & Branch
- **Repository**: Connected GitHub repository (`healthguardian-ai`)
- **Branch**: `main` (or your active production branch)
- **Root Directory**: `.` (leave empty or set to root)

---

## 3. Build & Start Commands

| Field | Configuration Value |
| :--- | :--- |
| **Build Command** | `npm run install:all && npm run build` |
| **Start Command** | `npm start` |

> **Alternative explicit Build Command**:
> `npm --prefix backend install && npm --prefix frontend install --include=dev && npm --prefix frontend run build`

---

## 4. Health Check Path
- **Health Check Path**: `/api/health` (or `/health`)
- Expected HTTP status: `200 OK`
- Expected JSON response: `{"ok":true,"status":"healthy","service":"healthguardian-ai-backend"}`

---

## 5. Environment Variables Configuration

Configure the following variables in the **Environment** tab on Render.

> **CRITICAL**: Do **NOT** commit real secrets to Git. Enter them directly into the Render dashboard.

### A. Server Configuration (Node Backend)
| Key | Required | Value / Description |
| :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` |
| `PORT` | Auto | *Set automatically by Render (defaults to 10000)* |
| `HOST` | Optional | `0.0.0.0` *(default)* |

### B. Multi-Provider AI Keys (Server-Only)
*Supply at least one key for AI features; the router automatically falls back through configured providers.*

| Key | Required | Description |
| :--- | :--- | :--- |
| `OPENROUTER_API_KEY` | Optional | OpenRouter API Key (Priority 1) |
| `GROQ_API_KEY` | Optional | Groq API Key (Priority 2) |
| `NVIDIA_API_KEY` | Optional | NVIDIA NIM API Key (Priority 3) |
| `MISTRAL_API_KEY` | Optional | Mistral AI API Key (Priority 4) |
| `SAMBANOVA_API_KEY` | Optional | SambaNova API Key (Priority 5) |
| `COHERE_API_KEY` | Optional | Cohere API Key (Priority 6) |
| `CEREBRAS_API_KEY` | Optional | Cerebras API Key (Priority 7) |

### C. Optional AI Model Overrides (Server-Only)
| Key | Default Value |
| :--- | :--- |
| `OPENROUTER_MODEL` | `openrouter/free` |
| `GROQ_MODEL` | `openai/gpt-oss-120b` |
| `NVIDIA_MODEL` | `meta/llama-3.2-11b-vision-instruct` |
| `MISTRAL_MODEL` | `mistral-small-latest` |
| `SAMBANOVA_MODEL` | `Meta-Llama-3.3-70B-Instruct` |
| `COHERE_MODEL` | `command-r-plus-08-2024` |
| `CEREBRAS_MODEL` | `gpt-oss-120b` |

### D. Client-Side Firebase Configuration (Vite Build Time)
*These public client keys are baked into the frontend bundle during `npm run build`.*

| Key | Required | Description |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Yes (for Auth) | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Yes (for Auth) | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Yes (for Auth) | Firebase Project ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes (for Auth) | Firebase Sender ID |
| `VITE_FIREBASE_APP_ID` | Yes (for Auth) | Firebase App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Optional | Firebase Analytics Measurement ID |
| `VITE_API_URL` | Optional | `/api` *(Relative same-origin default)* |

---

## 6. Expected Build Output & Architecture

- **Frontend Output Directory**: `frontend/dist/`
- **Architecture**: Single-Server Monolith
  ```
  Render Public URL (https://<service-name>.onrender.com)
  └── Node.js / Express Server (0.0.0.0:$PORT)
      ├── /api/*                    → API router (health, ai, search, extraction)
      ├── /manifest.webmanifest     → PWA static asset
      ├── /sw.js                    → Service worker
      ├── /assets/*                 → Bundled JS, CSS, PDF worker
      └── /* (SPA Fallback)         → frontend/dist/index.html
  ```

---

## 7. URL Structures

| Purpose | URL Route | Description |
| :--- | :--- | :--- |
| **Landing Page** | `GET /` | Public landing page (with Tamil/Hindi language selector) |
| **Authentication** | `GET /auth` | Firebase Email/Password Sign-In & Registration |
| **App Dashboard** | `GET /app/dashboard` | Main authenticated preventive health dashboard |
| **Unified Check-in** | `GET /app/checkin` | Conversational, Voice & Document check-in composer |
| **History & Trends** | `GET /app/history` | Chronological health logs & vitals charts |
| **Risk & Patterns** | `GET /app/risk` | Multi-factor risk analysis & pattern detection |
| **AI Assistant** | `GET /app/assistant` | Agentic health companion with web-search & citations |
| **Health API** | `GET /api/health` | Service uptime and status probe |
| **AI Status API** | `GET /api/ai/status` | List of configured AI providers (no secrets) |
| **AI Completion API** | `POST /api/ai/complete` | Multi-provider fallback completion endpoint |

---

## 8. Post-Deployment Smoke Tests

After Render completes the deployment, verify the following:

1. **Service Health Check**:
   ```bash
   curl -I https://<your-service>.onrender.com/api/health
   # Expected: HTTP/2 200 (or HTTP/1.1 200 OK)
   ```
2. **Landing Page & PWA Asset Load**:
   - Open `https://<your-service>.onrender.com/` in a browser.
   - Verify favicon, logos, and stylesheet load cleanly.
   - Verify `https://<your-service>.onrender.com/manifest.webmanifest` returns valid JSON.
3. **Language Switcher (Phase 11 Localization)**:
   - Switch language to **தமிழ்** and **हिन्दी** on the top header; confirm immediate UI translation.
4. **SPA Direct Route Refresh**:
   - Navigate to `https://<your-service>.onrender.com/app/dashboard` and refresh the browser.
   - Verify that the page loads without 404 errors.
5. **AI Status Endpoint**:
   ```bash
   curl https://<your-service>.onrender.com/api/ai/status
   # Expected: JSON object showing configured providers with no secrets exposed
   ```

---

## 9. Common Deployment Errors & Troubleshooting

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **Build fails with missing modules** | Only frontend or root was installed | Use Build Command: `npm run install:all && npm run build` |
| **Health check timeout on `/api/health`** | Server bound to `127.0.0.1` instead of `0.0.0.0` or wrong `PORT` | Verify `backend/server.js` listens on `process.env.HOST || '0.0.0.0'` and `process.env.PORT` |
| **SPA route gives 404 on refresh** | Server missing regex/SPA fallback | Verify `backend/server.js` serves `index.html` for non-API routes |
| **Firebase Auth fails in production** | Authorized domain not added in Firebase | Add your `<service-name>.onrender.com` domain to **Firebase Console → Authentication → Settings → Authorized domains** |
| **API calls fail with CORS error** | Frontend calling hardcoded localhost URL | Verify `VITE_API_URL` is unset or set to `/api` (same-origin relative routing) |
