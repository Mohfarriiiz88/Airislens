# ============================================================
# Stage 1: Install dependencies
# ============================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules (sharp, etc.)
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# ============================================================
# Stage 2: Build the application
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy all deps (including devDeps for build)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# Set dummy env values so Next.js can build without real secrets.
# These are ONLY used at build time for static analysis – runtime values
# come from the actual .env / docker-compose environment.
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build standalone output
RUN npm run build

# ============================================================
# Stage 3: Production runner
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone server output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Create uploads directory and set permissions
RUN mkdir -p /var/lib/airislens/uploads && \
    chown -R nextjs:nodejs /var/lib/airislens

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
