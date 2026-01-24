#!/bin/sh
set -e

echo "Starting Coffee POS..."
echo "Checking database at /app/data/coffee-pos.db"

# Initialize database if it doesn't exist
if [ ! -f /app/data/coffee-pos.db ]; then
  echo "Database not found. Initializing..."
  cd /app
  
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
  echo "Database already exists. Skipping initialization."
fi

# Start the application
echo "Starting server..."
exec "$@"
