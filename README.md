# LEO OS — Recruitment & Employment Operations

CRM/HRM platform for recruitment and employment agencies. Web (React) + mobile (Expo) clients share one Express API.

## Stack

- **Monorepo:** pnpm workspaces, TypeScript 5.9
- **Web:** React 19, Vite, Tailwind 4, shadcn/ui
- **Mobile:** Expo Router (React Native)
- **API:** Express 5, Drizzle ORM, OpenAPI → Orval codegen
- **Live dev:** Supabase Postgres + Supabase Auth (`pnpm dev:live`)
- **Local-only dev:** Docker Postgres + dev JWT auth (optional)

## Prerequisites

- Node.js 20+
- pnpm 9+ (`npx pnpm` works on Windows)
- A [Supabase](https://supabase.com) project (Leo project is already provisioned)

---

## Live development (Supabase) — current setup

Schema and roles are already in your **Leo** project. Run the app against live Supabase:

### 1. Add secrets (one-time)

```powershell
cd leo_app
copy .env.local.example .env.local
notepad .env.local
```

Fill in two values from [Supabase Dashboard → Leo](https://supabase.com/dashboard/project/tdrzgemsyymsakigbazn):

| Variable | Where |
|----------|--------|
| `DATABASE_URL` password | Settings → Database → Connection string → **Transaction pooler** (port 6543) |
| `SUPABASE_JWT_SECRET` | Settings → API → **JWT Secret** |

### 2. Create your login user

[Authentication → Users](https://supabase.com/dashboard/project/tdrzgemsyymsakigbazn/auth/users) → **Add user** (email + password).

First login gets **employee** role. Promote to **super_admin** via the app **Users** page.

### 3. Start API + web together

```powershell
npx pnpm dev:live
```

- Web: **http://localhost:5173**
- API: **http://localhost:8080/api/healthz**

---

## Local development (Docker — optional)

### 1. Install dependencies

```bash
cd leo_app
npx pnpm install
```

### 2. Create env file

```bash
copy .env.local.example .env
```

The defaults use **local Docker Postgres** and **dev auth** — no Supabase account needed.

### 3. Start database + seed

**With Docker:**

```bash
npx pnpm dev:setup
```

**Without Docker** — use your Supabase project's database URL in `.env`:

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Then apply schema and seed:

```bash
npx pnpm --filter @workspace/scripts run wait-for-db
npx pnpm --filter @workspace/db run push
npx pnpm --filter @workspace/scripts run seed
```

If `db push` fails because Postgres is still starting (Docker), wait 10 seconds and retry `push`.

### 4. Run the app

Terminal 1 — API:

```bash
npx pnpm dev:api
```

Terminal 2 — Web:

```bash
npx pnpm dev:web
```

Open **http://localhost:5173** and sign in with:

| Email | Password | Role |
|-------|----------|------|
| `admin@local.dev` | `leo123` | super_admin |
| `employee@local.dev` | `leo123` | employee |

(Password is `DEV_PASSWORD` in `.env`.)

API health: **http://localhost:8080/api/healthz**

### Stop local database

```bash
npx pnpm dev:db:down
```

## Deploy to production

**Supabase** already hosts your database and auth. Deploy the API + web using **[DEPLOY.md](./DEPLOY.md)** (Render + Vercel, ~15 min).

Quick summary:

1. **Render** — deploy API (`render.yaml`) with Supabase `DATABASE_URL`
2. **Vercel** — deploy web with Supabase anon key + `API_URL`
3. **Supabase Auth** — set Site URL to your Vercel domain

## Deploy to Supabase (reference)

1. Create a project at [supabase.com](https://supabase.com)
2. Update `.env` (or production env vars):
   - `DATABASE_URL` → Supabase pooler URL (port 6543)
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Set `DEV_AUTH=false` and `VITE_DEV_AUTH=false`
3. Push schema: `npx pnpm --filter @workspace/db run push`
4. Create users in Supabase Auth → assign roles via `/users` or seed script
5. Deploy API (Railway/Render) + web (Vercel)

See `.env.local.example` for production variable comments.

---

## Roles

| Role | Access |
|------|--------|
| `super_admin` | Full access + user/role management |
| `admin` | All operational modules + settings |
| `employee` | Candidates, clients, LOA; limited billing read |

---

## Useful commands

```bash
npx pnpm run typecheck
npx pnpm dev:db          # start Docker Postgres only
npx pnpm dev:setup       # db + schema + seed
npx pnpm dev:api         # API on :8080
npx pnpm dev:web         # Web on :5173
```
