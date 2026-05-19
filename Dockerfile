# =============================================
# Stage 1: Base — shared dependencies
# =============================================
FROM node:20-alpine AS base
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# --------------------------------------------------
# Stage 2: Dependencies — install production deps
# --------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# --------------------------------------------------
# Stage 3: Builder — full install + build
# --------------------------------------------------
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# --------------------------------------------------
# Stage 4: Production runner — minimal image
# --------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PRIVATE_STANDALONE=true

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled output from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./

# Create sync storage directory with correct permissions
RUN mkdir -p .mnit-sync && chown -R nextjs:nodejs .mnit-sync

# Switch to non-root user for security
USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["npm", "start"]
