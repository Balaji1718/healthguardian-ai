# HealthGuardian AI — Render Environment Template
**Phase 12B Configuration Guide for Render Dashboard**

This template provides a copy-ready reference for adding environment variables to your Render Web Service dashboard under the **Environment** tab.

---

## 1. Environment Variable Reference Table

| KEY | VALUE SOURCE | REQUIRED | SECRET / PUBLIC | DESCRIPTION |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Explicit | **Yes** | Public | Sets Node to production mode (`production`) |
| `PORT` | Auto (Render) | No | Public | Render sets this automatically (defaults to 10000) |
| `HOST` | Explicit | **Recommended** | Public | Binds Express to `0.0.0.0` across container interfaces |
| `OPENROUTER_API_KEY` | `backend/.env` / `render-env-values.local.txt` | Optional* | **Server Secret** | OpenRouter API Key (Priority 1) |
| `GROQ_API_KEY` | `backend/.env` / `render-env-values.local.txt` | Optional* | **Server Secret** | Groq API Key (Priority 2) |
| `NVIDIA_API_KEY` | `backend/.env` / `render-env-values.local.txt` | Optional* | **Server Secret** | NVIDIA NIM API Key (Priority 3) |
| `MISTRAL_API_KEY` | `backend/.env` / `render-env-values.local.txt` | Optional* | **Server Secret** | Mistral AI API Key (Priority 4) |
| `SAMBANOVA_API_KEY` | `backend/.env` / `render-env-values.local.txt` | Optional* | **Server Secret** | SambaNova API Key (Priority 5) |
| `COHERE_API_KEY` | `backend/.env` / `render-env-values.local.txt` | Optional* | **Server Secret** | Cohere API Key (Priority 6) |
| `CEREBRAS_API_KEY` | `backend/.env` / `render-env-values.local.txt` | Optional* | **Server Secret** | Cerebras API Key (Priority 7) |
| `OPENROUTER_MODEL` | Default / Optional | No | Public | Model ID override for OpenRouter (`openrouter/free`) |
| `GROQ_MODEL` | Default / Optional | No | Public | Model ID override for Groq (`openai/gpt-oss-120b`) |
| `NVIDIA_MODEL` | Default / Optional | No | Public | Model ID override for NVIDIA (`meta/llama-3.2-11b-vision-instruct`) |
| `MISTRAL_MODEL` | Default / Optional | No | Public | Model ID override for Mistral (`mistral-small-latest`) |
| `SAMBANOVA_MODEL` | Default / Optional | No | Public | Model ID override for SambaNova (`Meta-Llama-3.3-70B-Instruct`) |
| `COHERE_MODEL` | Default / Optional | No | Public | Model ID override for Cohere (`command-r-plus-08-2024`) |
| `CEREBRAS_MODEL` | Default / Optional | No | Public | Model ID override for Cerebras (`gpt-oss-120b`) |
| `VITE_API_URL` | Default / Explicit | **Recommended** | Public Client | Relative path `/api` for same-origin routing |
| `VITE_FIREBASE_API_KEY` | `frontend/.env` / `render-env-values.local.txt` | **Yes (Auth)** | Public Client | Firebase Web API Key for client authentication |
| `VITE_FIREBASE_AUTH_DOMAIN` | `frontend/.env` / `render-env-values.local.txt` | **Yes (Auth)** | Public Client | Firebase Authentication Domain |
| `VITE_FIREBASE_PROJECT_ID` | `frontend/.env` / `render-env-values.local.txt` | **Yes (Auth)** | Public Client | Firebase Project ID |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `frontend/.env` / `render-env-values.local.txt` | **Yes (Auth)** | Public Client | Firebase Cloud Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | `frontend/.env` / `render-env-values.local.txt` | **Yes (Auth)** | Public Client | Firebase Web App ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | `frontend/.env` / `render-env-values.local.txt` | Optional | Public Client | Firebase Analytics Measurement ID |

---

## 2. Render Environment Variable Keys (Copy-Ready Block)

Paste the following block into Render's **Environment** editor (or click "Add from .env"), replacing the `<copy-from-render-env-values.local.txt>` placeholders with the actual values in your local `render-env-values.local.txt` file:

```env
NODE_ENV=production
HOST=0.0.0.0
VITE_API_URL=/api

# AI Provider API Keys (Copy exact values from render-env-values.local.txt)
OPENROUTER_API_KEY=<copy-from-render-env-values.local.txt>
GROQ_API_KEY=<copy-from-render-env-values.local.txt>
NVIDIA_API_KEY=<copy-from-render-env-values.local.txt>
MISTRAL_API_KEY=<copy-from-render-env-values.local.txt>
SAMBANOVA_API_KEY=<copy-from-render-env-values.local.txt>
COHERE_API_KEY=<copy-from-render-env-values.local.txt>
CEREBRAS_API_KEY=<copy-from-render-env-values.local.txt>

# AI Provider Model Overrides
OPENROUTER_MODEL=openrouter/free
GROQ_MODEL=openai/gpt-oss-120b
NVIDIA_MODEL=meta/llama-3.2-11b-vision-instruct
MISTRAL_MODEL=mistral-small-latest
SAMBANOVA_MODEL=Meta-Llama-3.3-70B-Instruct
COHERE_MODEL=command-r-plus-08-2024
CEREBRAS_MODEL=gpt-oss-120b

# Firebase Client Configuration (Copy exact values from render-env-values.local.txt)
VITE_FIREBASE_API_KEY=<copy-from-render-env-values.local.txt>
VITE_FIREBASE_AUTH_DOMAIN=<copy-from-render-env-values.local.txt>
VITE_FIREBASE_PROJECT_ID=<copy-from-render-env-values.local.txt>
VITE_FIREBASE_MESSAGING_SENDER_ID=<copy-from-render-env-values.local.txt>
VITE_FIREBASE_APP_ID=<copy-from-render-env-values.local.txt>
VITE_FIREBASE_MEASUREMENT_ID=<copy-from-render-env-values.local.txt>
```
