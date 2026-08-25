#!/bin/sh
set -e

echo "Starting Coffee POS..."

# Run as root here so we can repair the ownership of mounted volumes:
# volumes created by older deployments (or by root-era images) have
# root-owned files/dirs, which makes SQLite WAL mode fail with
# SQLITE_READONLY_DIRECTORY and crashed the entrypoint -> restart loop.
mkdir -p /app/data /app/dist/client/uploads
chown -R astro:nodejs /app/data /app/dist/client/uploads

echo "Checking database at /app/data/coffee-pos.db"

cd /app

# Initialize database if it doesn't exist
if [ ! -f /app/data/coffee-pos.db ]; then
  echo "Database not found. Initializing..."

  echo "Running setup-db.ts..."
  bun run scripts/setup-db.ts

  echo "Running seed-db.ts..."
  bun run scripts/seed-db.ts

  echo "Database initialized successfully!"
  echo ""
  echo "Default credentials:"
  echo "  Admin:   admin / admin123"
  echo "  Cashier: cashier / cashier123"
  echo ""
else
  echo "Database already exists. Running migrations..."
  bun run scripts/migrate-db.ts
fi

# Drop privileges and start the application as the astro user
echo "Starting server..."
exec su-exec astro:nodejs "$@"
