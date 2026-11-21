#!/bin/sh
# Dev-only entrypoint. Keeps the SQLite database between restarts and starts
# the Astro dev server with hot reload. Production uses docker-entrypoint.sh.
set -e

cd /app

mkdir -p data public/uploads

if [ ! -f data/coffee-pos.db ]; then
  echo "Dev database not found - creating and seeding..."
  bun run scripts/setup-db.ts
  bun run scripts/seed-db.ts
else
  echo "Dev database found - running migrations..."
  bun run scripts/migrate-db.ts
fi

exec bunx --bun astro dev --host 0.0.0.0 --port "${PORT:-4322}"
