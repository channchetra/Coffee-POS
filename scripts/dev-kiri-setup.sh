#!/bin/sh
# Prepare and start the Kiri dev stack.
#
# Dependencies are installed in a one-off host-network container because this
# host runs Docker and Kiri at the same time; both claim 172.17.0.0/16, so the
# default Kiri bridge has no egress. Runtime services use a Kiri user network.
set -e

cd "$(dirname "$0")/.."

if ! command -v kiri >/dev/null 2>&1; then
  echo "Kiri CLI not found. Install it from https://docs.runkiri.com/quick-start/" >&2
  exit 1
fi

BUN_IMAGE="${BUN_IMAGE:-oven/bun:1.4-alpine}"
UID_GID="$(id -u):$(id -g)"

echo "Installing app dependencies..."
kiri run --rm --network host \
  -v "$PWD:/app" -w /app -u "$UID_GID" -e HOME=/tmp \
  "$BUN_IMAGE" bun install --frozen-lockfile

echo "Installing dev tools (desloppify)..."
mkdir -p .dev-tools
kiri run --rm --network host \
  -v "$PWD:/app" -w /app/.dev-tools -u "$UID_GID" -e HOME=/tmp \
  "$BUN_IMAGE" bun install

echo "Starting dev stack..."
kiri compose -f docker-compose.dev.yml up -d

echo "App: http://localhost:${DEV_PORT:-4322}/"
echo "Scan: bun run quality:desloppify"
echo "Test: bun run test:kiri"
