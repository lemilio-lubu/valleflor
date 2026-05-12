FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm fetch --filter @floricultura/api...

FROM base AS build
COPY --from=deps /pnpm /pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --offline --frozen-lockfile --filter @floricultura/api...
COPY apps/api apps/api
COPY packages/shared-types packages/shared-types
RUN pnpm --filter @floricultura/shared-types build && pnpm --filter @floricultura/api build && pnpm deploy --filter @floricultura/api --prod /prod/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/api ./
EXPOSE 3001
CMD ["sh", "-c", "node dist/seed && node dist/main"]
