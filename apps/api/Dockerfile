FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_STORE_DIR="/pnpm/store"
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

# Stage: fetch — only downloads packages into the store (no source code needed)
FROM base AS fetch
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm fetch --store-dir $PNPM_STORE_DIR

# Stage: build — installs from the store offline and compiles
FROM base AS build
WORKDIR /app
COPY --from=fetch $PNPM_STORE_DIR $PNPM_STORE_DIR
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --offline --frozen-lockfile --store-dir $PNPM_STORE_DIR --filter @floricultura/api...
COPY apps/api apps/api
COPY packages/shared-types packages/shared-types
RUN pnpm --filter @floricultura/shared-types build
RUN pnpm --filter @floricultura/api build
RUN pnpm deploy --filter @floricultura/api --prod /prod/api

# Stage: runtime — minimal image with only production output
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/api ./
EXPOSE 3001
CMD ["node", "dist/main"]
