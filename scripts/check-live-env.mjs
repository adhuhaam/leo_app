import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

for (const file of [".env", ".env.local"]) {
  const p = path.join(root, file);
  if (existsSync(p)) config({ path: p, override: file === ".env.local" });
}

const missing = [];
const placeholders = [];

if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
else if (process.env.DATABASE_URL.includes("YOUR_DB_PASSWORD")) {
  placeholders.push("DATABASE_URL (replace YOUR_DB_PASSWORD)");
}

if (!process.env.SUPABASE_URL && !process.env.SUPABASE_JWT_SECRET) {
  missing.push("SUPABASE_URL (or SUPABASE_JWT_SECRET for legacy JWT)");
}

if (missing.length || placeholders.length) {
  console.error("\n❌ Live dev needs secrets in `.env.local`\n");
  console.error("  1. copy .env.local.example .env.local");
  console.error("  2. Set your Supabase database password");
  console.error("  3. Run: npx pnpm dev:live\n");
  if (missing.length) console.error("Missing:", missing.join(", "));
  if (placeholders.length) console.error("Still placeholders:", placeholders.join(", "));
  process.exit(1);
}

console.log("✓ Live env OK — Supabase connected");
