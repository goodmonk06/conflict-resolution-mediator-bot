# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

# Install dependencies
RUN npm ci

# Copy source code
COPY packages/backend ./packages/backend
COPY .prettierrc ./.prettierrc

# Generate Prisma client
WORKDIR /app/packages/backend
RUN npx prisma generate

# Build
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
RUN npm ci --only=production --workspace=backend

# Copy built application
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/prisma ./packages/backend/prisma
COPY --from=builder /app/packages/backend/node_modules/.prisma ./packages/backend/node_modules/.prisma

# Set working directory to backend
WORKDIR /app/packages/backend

# Expose API port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/index.js"]
