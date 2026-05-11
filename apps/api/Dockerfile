FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile --filter @floricultura/api...

FROM deps AS build
COPY tsconfig.json tsconfig.json
COPY apps/api apps/api
COPY packages/shared-types packages/shared-types
RUN pnpm --filter @floricultura/shared-types build && pnpm --filter @floricultura/api build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --prod --frozen-lockfile --filter @floricultura/api...
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
EXPOSE 3001
CMD ["pnpm", "--filter", "@floricultura/api", "start:prod"]
