# Passport OCR Dashboard

An AI-powered passport data extraction tool for Bangladesh and Indian passports. Upload passport images or PDFs and the system automatically extracts name, passport number, dates, address, and nationality using GPT vision OCR.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/passport-ocr run dev` — run the frontend (port varies)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY` — OpenAI via Replit AI Integrations

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- OCR: OpenAI GPT vision (via Replit AI Integrations, no API key needed)
- File uploads: multer (memory storage)
- PDF-to-image: pdf2pic + sharp
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/passports.ts` — Passport table schema
- `artifacts/api-server/src/routes/passports.ts` — Passport CRUD + upload routes
- `artifacts/api-server/src/lib/ocr.ts` — OpenAI vision OCR extraction logic
- `artifacts/passport-ocr/src/` — React frontend (pages, components)

## Architecture decisions

- OCR is processed asynchronously: upload returns a `processing` record immediately, then OCR runs in background and updates to `completed`/`failed`
- File uploads use multer memory storage (no disk writes); PDF pages converted to JPEG via pdf2pic before sending to GPT vision
- Images are resized to max 1600x1200 via sharp before OCR to reduce token usage
- `api-zod` tsconfig includes DOM lib to support File/Blob types generated from multipart spec

## Product

Users upload passport images (JPG, PNG, PDF) for Bangladesh and Indian passports. The app extracts: full name, passport number, date of birth, date of issue, date of expiry, address, and nationality. Extracted records are stored in PostgreSQL and displayed in a CRUD dashboard with search, filter, edit, and delete capabilities.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Re-run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change
- `sharp` requires native build approval: run `pnpm approve-builds` and select sharp if PDF conversion fails
- Always run `pnpm --filter @workspace/db run push` after schema changes
- OCR uses `gpt-5.4` model with vision — requires `AI_INTEGRATIONS_OPENAI_BASE_URL` env var

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
