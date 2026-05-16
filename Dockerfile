# ====================== Stage 1: Build ======================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Use npm install instead of ci (more forgiving when lockfile is outdated)
RUN npm install --production

# ====================== Stage 2: Production ======================
FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs expressuser

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Set proper permissions
RUN chown -R expressuser:nodejs /app

USER expressuser

EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000 || exit 1

CMD ["node", "app.js"]
