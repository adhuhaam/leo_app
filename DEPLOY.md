# Deploy LEO OS with Supabase

Your **Leo** Supabase project already hosts:

| Component | Status |
|-----------|--------|
| PostgreSQL database | ✅ Live |
| Auth (login) | ✅ Live |
| Schema + roles migrations | ✅ Applied |

Supabase does **not** host Express APIs or React apps. Deploy those separately and connect them to Supabase.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│  Vercel (web)   │────▶│  Render (API)    │────▶│  Supabase (DB + Auth)   │
│  React / Vite   │     │  Express         │     │  tdrzgemsyymsakigbazn     │
└─────────────────┘     └──────────────────┘     └─────────────────────────┘
```

---

## Step 1 — Push code to GitHub

Commit your changes and push to `https://github.com/adhuhaam/leo_app`.

---

## Step 2 — Deploy the API (Render, free tier)

1. Go to [render.com](https://render.com) → **New** → **Blueprint**
2. Connect repo `adhuhaam/leo_app`
3. Render reads `render.yaml` automatically
4. When prompted for **DATABASE_URL**, paste:

```text
postgresql://postgres.tdrzgemsyymsakigbazn:YOUR_PASSWORD@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

5. Deploy → copy your API URL (e.g. `https://leo-api.onrender.com`)
6. Test: `https://YOUR-API.onrender.com/api/healthz` → `{"status":"ok"}`

Optional: add `OPENAI_API_KEY` in Render env for passport OCR.

---

## Step 3 — Deploy the web app (Vercel)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import `adhuhaam/leo_app`
3. **Environment variables** (Production):

| Variable | Value |
|----------|--------|
| `VITE_SUPABASE_URL` | `https://tdrzgemsyymsakigbazn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(from Supabase → Settings → API → anon key)* |
| `VITE_DEV_AUTH` | `false` |
| `API_URL` | `https://YOUR-API.onrender.com` *(no trailing slash)* |

4. **Build settings:**
   - Build command: `node scripts/prepare-vercel.mjs && pnpm install && pnpm --filter @workspace/passport-ocr run build`
   - Output directory: `artifacts/passport-ocr/dist/public`
   - Install command: `pnpm install`

5. Deploy → copy your Vercel URL (e.g. `https://leo-app.vercel.app`)

---

## Step 4 — Configure Supabase Auth URLs

In [Supabase → Authentication → URL Configuration](https://supabase.com/dashboard/project/tdrzgemsyymsakigbazn/auth/url-configuration):

| Setting | Value |
|---------|--------|
| **Site URL** | `https://YOUR-APP.vercel.app` |
| **Redirect URLs** | `https://YOUR-APP.vercel.app/**` |

Save, then sign in on the live site with `adhuhamlayaal55@gmail.com`.

---

## Step 5 — Verify production

- [ ] Web loads at your Vercel URL
- [ ] Login works (Supabase Auth)
- [ ] Dashboard shows data (API → Supabase DB)
- [ ] Super admin nav visible (Users, Settings, etc.)

---

## Environment reference

### API (Render)

```env
NODE_ENV=production
PORT=8080
DEV_AUTH=false
SUPABASE_URL=https://tdrzgemsyymsakigbazn.supabase.co
DATABASE_URL=postgresql://postgres.tdrzgemsyymsakigbazn:...@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres
```

JWT verification uses Supabase JWKS automatically — no JWT secret required on the API.

### Web (Vercel)

```env
VITE_SUPABASE_URL=https://tdrzgemsyymsakigbazn.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_DEV_AUTH=false
API_URL=https://YOUR-API.onrender.com
```

---

## Alternative: Railway for API

`railway.toml` is included. Connect the repo on [railway.app](https://railway.app), set the same env vars, deploy.

---

## Mobile (later)

Update `artifacts/passport-ocr-mobile/eas.json` with production `EXPO_PUBLIC_API_URL` and Supabase keys, then `eas build`.
