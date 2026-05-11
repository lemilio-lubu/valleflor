FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --frozen-lockfile --filter @floricultura/web...

FROM deps AS build
COPY tsconfig.json tsconfig.json
COPY apps/web apps/web
COPY packages/shared-types packages/shared-types
RUN pnpm --filter @floricultura/shared-types build && pnpm --filter @floricultura/web build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --prod --frozen-lockfile --filter @floricultura/web...
COPY --from=build /app/apps/web/.next apps/web/.next
COPY --from=build /app/apps/web/next.config.js apps/web/next.config.js
COPY --from=build /app/apps/web/package.json apps/web/package.json
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
EXPOSE 3000
CMD ["pnpm", "--filter", "@floricultura/web", "start", "--", "-p", "3000"]
