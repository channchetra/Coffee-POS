# Use official Bun image (Alpine-based, latest 1.x)
FROM oven/bun:1-alpine AS base

# Install wget for healthcheck
RUN apk add --no-cache wget

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies (skip frozen lockfile for compatibility)
RUN bun install

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN bun run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 astro

# Create data directory for SQLite
RUN mkdir -p /app/data && chown -R astro:nodejs /app/data

# Create uploads directory
RUN mkdir -p /app/dist/client/uploads && chown -R astro:nodejs /app/dist/client/uploads

# Copy built application
COPY --from=builder --chown=astro:nodejs /app/dist ./dist
COPY --from=builder --chown=astro:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=astro:nodejs /app/package.json ./package.json

# Copy scripts for database setup
COPY --from=builder --chown=astro:nodejs /app/scripts ./scripts
COPY --from=builder --chown=astro:nodejs /app/src/lib/db/schema.sql ./src/lib/db/schema.sql
COPY --from=builder --chown=astro:nodejs /app/src/lib/auth ./src/lib/auth

# Copy public assets that might be needed
COPY --from=builder --chown=astro:nodejs /app/public ./public

# Copy entrypoint script
COPY --chown=astro:nodejs docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

# Switch to non-root user
USER astro

# Expose port
EXPOSE 4321

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4321/ || exit 1

# Use entrypoint for database initialization
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Start the application
CMD ["bun", "run", "./dist/server/entry.mjs"]
