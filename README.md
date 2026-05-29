# FOOD FOR ANY MOOD

Hebrew-first mood-based recipe app — **FOOD FOR ANY MOOD** title stays in English; all UI and recipes are in Hebrew by default.

| Layer | Deploy to |
|-------|-----------|
| React + Vite frontend | [Vercel](https://vercel.com) |
| FastAPI + Gemini backend | [Render](https://render.com) |

**Security:** `GEMINI_API_KEY` is **backend only** (Render env / `backend/.env`). Never put it in Vercel or any `VITE_*` variable.

---

## Local development

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env → set GEMINI_API_KEY
uvicorn main:app --reload --host 127.0.0.1 --port 8010
```

### Frontend

```bash
cp .env.example .env
npm install
npm run dev
```

`.env` (local):

```
VITE_API_BASE_URL=http://127.0.0.1:8010
VITE_RECIPE_PROVIDER=ai
```

API config lives in `src/config/api.js` and reads `import.meta.env.VITE_API_BASE_URL`.

---

## Deploy backend (Render)

1. [Render](https://render.com) → **New Web Service** → connect this repo.
2. **Root Directory:** `backend`
3. **Runtime:** Python 3
4. **Build Command:**

   ```bash
   pip install -r requirements.txt
   ```

5. **Start Command:**

   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

6. **Environment variables:**

   | Variable | Required | Notes |
   |----------|----------|-------|
   | `GEMINI_API_KEY` | Yes | From [Google AI Studio](https://aistudio.google.com/apikey) |
   | `GEMINI_MODEL` | No | Default `gemini-2.0-flash` |
   | `CORS_ALLOW_ALL` | MVP | Set `true` for public launch; **restrict later** |
   | `CORS_ORIGINS` | Later | e.g. `https://your-app.vercel.app` |
   | `CORS_ORIGIN_REGEX` | No | Default `https://.*\.vercel\.app` |
   | `PORT` | Auto | Provided by Render |

7. Copy your service URL, e.g. `https://food-for-any-mood-api.onrender.com`.

### Test backend after deploy

**Health:**

```bash
curl https://YOUR-RENDER-URL.onrender.com/health
```

Expected:

```json
{"status":"ok","service":"food-for-any-mood-api"}
```

**Generate recipe:**

```bash
curl -X POST https://YOUR-RENDER-URL.onrender.com/generate-recipe \
  -H "Content-Type: application/json" \
  -d '{"category":"dairy","ingredients":"גבינה, עגבניות","cookingTime":30,"mood":"cozy","isGlutenFree":false,"musicPlatform":"spotify"}'
```

Expected: HTTP 200 with `{ "recipe": { ... }, "source": "gemini" | "mock", ... }`.

If Gemini fails (quota/key), `source` is `"mock"` and a Hebrew fallback recipe is still returned.

---

## Deploy frontend (Vercel)

1. [Vercel](https://vercel.com) → **Add New Project** → import this repo.
2. **Framework Preset:** Vite
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Environment variables** (Production):

   | Variable | Value |
   |----------|-------|
   | `VITE_API_BASE_URL` | `https://YOUR-RENDER-URL.onrender.com` |
   | `VITE_RECIPE_PROVIDER` | `ai` |

6. **Deploy** — Vite bakes `VITE_*` at build time; redeploy after changing env vars.

7. Open your Vercel URL and click **צור מתכון**.

### CORS after Vercel deploy

For MVP, set on Render:

```
CORS_ALLOW_ALL=true
```

Before scaling, switch to:

```
CORS_ALLOW_ALL=false
CORS_ORIGINS=https://your-app.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
```

Local dev always allows `http://localhost:5173` and `http://127.0.0.1:5173`.

---

## Environment variables summary

### Frontend (Vercel / `.env`)

```
VITE_API_BASE_URL=https://your-backend.onrender.com
VITE_RECIPE_PROVIDER=ai
```

### Backend (Render / `backend/.env`)

```
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.0-flash
CORS_ALLOW_ALL=true
```

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health check |
| `POST` | `/generate-recipe` | Hebrew recipe (Gemini + mock fallback) |

---

## Fallback behavior

- Backend unreachable → Hebrew notice + local mock recipe
- Gemini error → Hebrew notice + mock recipe from backend or local fallback
- UI stays Hebrew; **FOOD FOR ANY MOOD** title stays English

---

## Mobile testing (same WiFi)

1. Backend: `uvicorn main:app --host 0.0.0.0 --port 8010`
2. Frontend `.env`: `VITE_API_BASE_URL=http://192.168.x.x:8010`
3. Open Vite dev URL from your phone
