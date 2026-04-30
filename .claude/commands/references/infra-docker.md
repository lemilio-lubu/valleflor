# Referencia: Infraestructura — Docker y Docker Compose

Patrones para contenerización del monorepo Valleflor.

## Tabla de Contenidos

1. Filosofía
2. Dockerfile del backend (`apps/api`)
3. Dockerfile del frontend (`apps/web`)
4. docker-compose.yml (producción)
5. docker-compose.dev.yml (desarrollo)
6. .dockerignore
7. Healthchecks
8. Volúmenes y persistencia
9. Redes
10. Variables de entorno y secretos
11. Build optimizado para monorepo

---

## 1. Filosofía

- **Multi-stage builds** siempre: separar dependencias, build y runtime.
- **Imágenes pequeñas**: usar `node:20-alpine` o `node:20-slim` como base.
- **Usuario no root**: nunca correr el proceso como `root` en runtime.
- **Una sola responsabilidad por contenedor**: api, web, db, cada uno aislado.
- **Healthchecks** en todos los servicios.
- **Versiones pinneadas**: `node:20.11.1-alpine`, no `node:20-alpine` en producción.
- **`.dockerignore` riguroso**: no copiar `node_modules`, `.git`, `.env`, build artifacts del host.

---

## 2. Dockerfile del Backend (`apps/api/Dockerfile`)

```dockerfile
# syntax=docker/dockerfile:1.6

# ---------- Stage 1: deps ----------
FROM node:20.11.1-alpine AS deps
WORKDIR /workspace

# Copiar package.json del root y workspaces para aprovechar npm workspaces
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/api --include-workspace-root --omit=dev

# ---------- Stage 2: build ----------
FROM node:20.11.1-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/api --include-workspace-root

COPY tsconfig.base.json ./
COPY apps/api ./apps/api

WORKDIR /workspace/apps/api
RUN npm run build

# ---------- Stage 3: runtime ----------
FROM node:20.11.1-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

# Usuario no root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nestjs

COPY --from=deps  --chown=nestjs:nodejs /workspace/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /workspace/apps/api/dist ./dist
COPY --from=build --chown=nestjs:nodejs /workspace/apps/api/package.json ./package.json

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
```

**Notas**:
- Tres stages: `deps` (solo prod deps, queda en runtime), `build` (devDeps + build), `runtime` (mínimo).
- `--mount=type=cache` acelera builds locales (BuildKit).
- `npm ci` en lugar de `npm install` (determinista, falla si lockfile desincronizado).
- Endpoint `/health` debe existir en NestJS (`@nestjs/terminus`).

---

## 3. Dockerfile del Frontend (`apps/web/Dockerfile`)

```dockerfile
# syntax=docker/dockerfile:1.6

FROM node:20.11.1-alpine AS deps
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/web --include-workspace-root

FROM node:20.11.1-alpine AS build
WORKDIR /workspace

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web ./apps/web

WORKDIR /workspace/apps/web
RUN npm run build

FROM node:20.11.1-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

# Aprovecha output: 'standalone' de Next.js (definir en next.config.mjs)
COPY --from=build --chown=nextjs:nodejs /workspace/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /workspace/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "apps/web/server.js"]
```

**Requisito**: en `apps/web/next.config.mjs`:
```js
export default {
  output: 'standalone',
  reactStrictMode: true,
};
```

`standalone` produce un servidor mínimo con solo las dependencias necesarias, reduciendo la imagen final ~80%.

**`NEXT_PUBLIC_API_URL` como ARG**: las variables `NEXT_PUBLIC_*` se inlinean en build. Si cambian entre entornos, el build debe rehacerse.

---

## 4. `docker-compose.yml` (Producción / Staging)

```yaml
services:
  db:
    image: postgres:15.6-alpine
    container_name: valleflor-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - valleflor-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: valleflor-api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      API_NODE_ENV: production
      API_PORT: 3001
      POSTGRES_HOST: db
      POSTGRES_PORT: 5432
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_ACCESS_EXPIRES_IN: ${JWT_ACCESS_EXPIRES_IN}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_REFRESH_EXPIRES_IN: ${JWT_REFRESH_EXPIRES_IN}
      BCRYPT_SALT_ROUNDS: ${BCRYPT_SALT_ROUNDS}
      CORS_ORIGIN: ${CORS_ORIGIN}
    ports:
      - "${API_PORT:-3001}:3001"
    networks:
      - valleflor-net
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    container_name: valleflor-web
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    environment:
      NODE_ENV: production
    ports:
      - "${WEB_PORT:-3000}:3000"
    networks:
      - valleflor-net

volumes:
  postgres_data:
    driver: local

networks:
  valleflor-net:
    driver: bridge
```

**Reglas**:
- `restart: unless-stopped` en todo servicio.
- `depends_on` con `condition: service_healthy` para esperar a que la BD esté lista.
- `healthcheck` en todos los servicios; el orchestrator lo usa para reiniciar.
- Postgres pinneado a versión exacta (`15.6-alpine`).
- Volumen named (`postgres_data`), nunca bind mount al host en producción.
- Solo `api` y `web` exponen puertos al host; `db` queda en la red interna.

---

## 5. `docker-compose.dev.yml` (Desarrollo)

Override para desarrollo local con hot reload:

```yaml
services:
  db:
    ports:
      - "5432:5432" # exponer al host para conectar con cliente SQL local

  api:
    build:
      target: build  # usa el stage 'build' que tiene devDependencies
    command: npm run start:dev --workspace=apps/api
    volumes:
      - ./apps/api/src:/workspace/apps/api/src:ro
      - ./apps/api/tsconfig.json:/workspace/apps/api/tsconfig.json:ro
    environment:
      API_NODE_ENV: development

  web:
    build:
      target: build
    command: npm run dev --workspace=apps/web
    volumes:
      - ./apps/web/src:/workspace/apps/web/src:ro
      - ./apps/web/public:/workspace/apps/web/public:ro
    environment:
      NODE_ENV: development
```

Uso:
```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

**Reglas**:
- En dev se exponen más puertos para debugging.
- Volúmenes solo para `src` (no `node_modules` del host: causa conflictos con bindings nativos).
- En prod nunca se usa este compose.

---

## 6. `.dockerignore` (raíz)

```
# Git
.git
.gitignore

# Dependencias
**/node_modules
**/.next
**/dist
**/build
**/coverage

# IDE
.vscode
.idea
*.swp

# Logs
*.log
npm-debug.log*

# Env
.env
.env.*
!.env.example

# OS
.DS_Store
Thumbs.db

# Tests
**/.nyc_output

# Docs y misc
*.md
!README.md
docker-compose*.yml
Dockerfile*

# CI
.github
```

**Importante**: ignorar `node_modules` evita copiar binarios del host (que son distintos a los de Alpine en el contenedor).

---

## 7. Healthchecks

Backend NestJS con `@nestjs/terminus`:

```ts
// src/modules/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '@/modules/auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.pingCheck('database')]);
  }
}
```

Devuelve 200 si todo OK, 503 si algún check falla. Docker reinicia el contenedor tras 3 fallos.

---

## 8. Volúmenes y Persistencia

- **Postgres**: volumen named (`postgres_data`). Backups regulares con `pg_dump`.
- **Logs**: ideal stream a stdout (Docker captura), no a archivos dentro del contenedor.
- **Uploads de usuario**: nunca en volumen del contenedor en producción; usar S3 o equivalente.

---

## 9. Redes

- Una red bridge (`valleflor-net`) para comunicación interna.
- DNS interno: los servicios se referencian por nombre (`db`, `api`, `web`).
- En producción, considerar Traefik o Nginx como reverse proxy frente a `web` y `api` con TLS automático.

---

## 10. Variables de Entorno y Secretos

**Niveles**:

1. **Desarrollo local**: `.env` en raíz cargado por Compose (`env_file:` o variables en `environment:`).
2. **CI**: secrets del proveedor (GitHub Actions secrets).
3. **Producción**: Docker secrets, variables del orchestrator (Kubernetes Secrets, AWS SSM, etc.).

**Reglas**:
- Nunca commitear `.env`.
- `.env.example` documentado y actualizado.
- Secretos rotables: si se filtra un JWT secret, debe ser cambiable sin redeploy completo.
- En producción, considerar `docker secrets` o un gestor (Vault, AWS Secrets Manager).

---

## 11. Build Optimizado para Monorepo

**Cache layers ordenado**:
1. Copiar `package.json` y `package-lock.json` del root.
2. Copiar solo el `package.json` del workspace específico.
3. `npm ci`.
4. Copiar el código fuente.
5. Build.

Esto permite que cambios en código no invaliden la capa de dependencias.

**BuildKit habilitado** (default en Docker Desktop reciente):
```bash
export DOCKER_BUILDKIT=1
```

Permite `--mount=type=cache` y otros optimizadores.

**Tamaños esperados** después de optimización:
- API: ~150–250 MB
- Web (con `output: standalone`): ~200–300 MB
- Postgres alpine: ~250 MB

---

## Checklist de Infra

- [ ] Dockerfiles multi-stage con usuario no root.
- [ ] Versiones de imagen base pinneadas.
- [ ] `.dockerignore` cubre `node_modules`, `.env`, `.git`, builds.
- [ ] `npm ci` en lugar de `npm install`.
- [ ] Healthcheck en cada servicio.
- [ ] Postgres con volumen named, no expuesto al host en prod.
- [ ] CORS, secretos y env vars validadas al arranque.
- [ ] `output: 'standalone'` en `next.config.mjs`.
- [ ] Compose con `restart: unless-stopped` y `depends_on` con healthcheck.
- [ ] Sin `.env` commiteado; sí `.env.example` actualizado.
- [ ] Build aprovecha cache layers (deps antes de código).
