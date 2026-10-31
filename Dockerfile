FROM node:26-alpine AS base

# pnpm 11: allowBuilds n'est appliqué en Docker que si CI=true (pas de TTY).
ENV CI=true

# Node 26 n'embarque plus corepack : pnpm s'installe via npm.
RUN apk add --no-cache libc6-compat openssl \
    && npm install -g pnpm@11.22.0

WORKDIR /app


FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Les postinstall (workerd, esbuild...) ne servent pas au build et workerd ne tourne pas sur musl.
RUN pnpm install --frozen-lockfile --ignore-scripts


FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Valeur factice : le client Prisma lit l'URL à l'import, les vrais secrets sont fournis au runtime.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

RUN pnpm build


FROM base AS runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
