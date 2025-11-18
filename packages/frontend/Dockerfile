# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/frontend ./packages/frontend
COPY .prettierrc ./.prettierrc

# Build frontend
WORKDIR /app/packages/frontend
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Add non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install production dependencies
COPY package*.json ./
COPY packages/frontend/package*.json ./packages/frontend/
RUN npm ci --only=production --workspace=frontend

# Copy built application
WORKDIR /app/packages/frontend
COPY --from=builder /app/packages/frontend/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/packages/frontend/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/frontend/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose frontend port
EXPOSE 3001

ENV PORT 3001
ENV HOSTNAME "0.0.0.0"

# Start the application
CMD ["node", "server.js"]
