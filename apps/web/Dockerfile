FROM node:20-alpine AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm fetch --filter @floricultura/web...

FROM base AS build
COPY --from=deps /pnpm /pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
RUN pnpm install --offline --frozen-lockfile --filter @floricultura/web...
COPY apps/web apps/web
COPY packages/shared-types packages/shared-types
ARG NEXTAUTH_SECRET=build-placeholder
ARG NEXTAUTH_URL=http://localhost:3000
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
RUN pnpm --filter @floricultura/shared-types build && pnpm --filter @floricultura/web build

FROM base AS prod-deps
COPY --from=deps /pnpm /pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY --from=build /app/packages/shared-types/dist packages/shared-types/dist
RUN pnpm install --offline --prod --frozen-lockfile --filter @floricultura/web...

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app ./
COPY --from=build /app/apps/web/.next apps/web/.next
COPY --from=build /app/apps/web/public apps/web/public
COPY --from=build /app/apps/web/next.config.js apps/web/next.config.js
COPY --from=build /app/apps/web/package.json apps/web/package.json
EXPOSE 3000
CMD ["sh", "-c", "cd /app/apps/web && npx next start -p ${PORT:-3000}"]