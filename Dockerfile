# syntax=docker/dockerfile:1

# ── 1. Compile (toolchain only — no Chromium) ─────────────────────────────────
FROM node:22-bookworm-slim AS build

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages/shared packages/shared
COPY apps/backend apps/backend
COPY apps/frontend apps/frontend
COPY prompt-shortcuts prompt-shortcuts

RUN pnpm build:shared && pnpm build:backend && pnpm build:frontend

# ── 2. Production deps (backend + @knitto/shared only — no frontend toolchain) ──
FROM node:22-bookworm-slim AS backend-deps

RUN corepack enable && corepack prepare pnpm@11.5.2 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY apps/backend/package.json apps/backend/
COPY --from=build /app/apps/backend/dist apps/backend/dist

ENV CI=true
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod --filter @knitto/backend... \
    && pnpm prune --prod

# ── 3. Browser OS packages (Chromium + ffmpeg) ────────────────────────────────
FROM node:22-bookworm-slim AS browser-base

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

ENV NODE_ENV=production \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# ── 4. Backend runtime (no pnpm, no devDeps, no frontend packages) ──────────
FROM browser-base AS backend

WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY apps/backend/package.json apps/backend/
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=backend-deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build /app/prompt-shortcuts ./prompt-shortcuts

# System ffmpeg is used (AUTOMATION_FFMPEG_PATH); bundled binary not needed (~66MB)
RUN rm -rf /app/node_modules/.pnpm/@ffmpeg-installer+linux-x64@* \
    && rm -rf /app/node_modules/.pnpm/typescript@*

RUN mkdir -p storage screenshoot/agents memory

WORKDIR /app/apps/backend

EXPOSE 3080

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3080/api/prompt-shortcuts').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]

# ── 5. Frontend runtime (static assets + nginx) ───────────────────────────────
FROM nginx:1.27-alpine AS frontend

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
