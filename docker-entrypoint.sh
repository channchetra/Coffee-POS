#!/bin/sh
set -e

# Initialize database if it doesn't exist
if [ ! -f /app/data/coffee-pos.db ]; then
  echo "Initializing database..."
  cd /app
  bun run scripts/setup-db.ts
  bun run scripts/seed-db.ts
  echo "Database initialized successfully!"
fi

# Start the application
exec "$@"
