# ── Stage 1: install production dependencies ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── Stage 2: production image ──
FROM node:20-alpine
WORKDIR /app

# Security: run as non-root
RUN addgroup -S axion && adduser -S axion -G axion

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Remove dev/test files from final image
RUN rm -rf tests .git .env .env.example dump.rdb are-axions.jpeg

USER axion

EXPOSE 5112

CMD ["node", "index.js"]
