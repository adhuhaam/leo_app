import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";

let loaded = false;

function findMonorepoRoot(startDir = process.cwd()): string {
  let dir = path.resolve(startDir);
  while (true) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return path.resolve(startDir);
    }
    dir = parent;
  }
}

/** Load `.env` then `.env.local` from the monorepo root (once). */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;

  const monorepoRoot = findMonorepoRoot();

  for (const file of [".env", ".env.local"]) {
    const envPath = path.join(monorepoRoot, file);
    if (existsSync(envPath)) {
      config({ path: envPath, override: file === ".env.local" });
    }
  }
}

loadEnv();
