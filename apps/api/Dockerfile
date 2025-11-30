# Pre-built production Dockerfile
# Build locally with npm run build before deploying
FROM node:18-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001
ENV DOCKER_MODE=true

# Install runtime dependencies
RUN apk add --no-cache openssl curl

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy package files
COPY package.json ./
COPY prisma ./prisma/

# Copy shared package BEFORE npm install so npm finds it locally
COPY shared ./node_modules/@steno/shared

# Install production dependencies (npm will find @steno/shared in node_modules)
RUN npm install --omit=dev --ignore-scripts && \
    npx prisma generate

# Copy pre-built dist folder
COPY dist ./dist

# Verify dist/ folder exists and contains app.js
RUN ls -la && \
    ls -la dist/ && \
    test -f dist/app.js || (echo "ERROR: dist/app.js not found!" && exit 1) && \
    echo "✓ dist/app.js verified"

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check using curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start application
CMD ["node", "dist/app.js"]
