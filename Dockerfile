# =============================================
# Stage 1: Base — shared dependencies
# =============================================
FROM node:20-alpine AS base
WORKDIR /app

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
    NEXT_TELEMETRY_DISABLED=1

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled output from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000

CMD ["npm", "start"]
