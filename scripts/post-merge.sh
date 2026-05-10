#!/bin/bash
set -e
pnpm install --frozen-lockfile
# `drizzle-kit push` is interactive when it detects data-loss statements. We
# pipe "No" to abort destructive changes so post-merge can never wipe a table
# (e.g. `session`) just because a schema declaration drifted.
printf 'No\n' | pnpm --filter db push || {
  echo "drizzle push aborted (likely due to a data-loss prompt). Inspect manually with: pnpm --filter @workspace/db run push"
  exit 0
}
