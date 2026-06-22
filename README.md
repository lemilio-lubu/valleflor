# 🌸 Valleflor — Sistema de Estimaciones Agrícolas

Sistema de gestión de estimaciones florícolas para el **Grupo Agroindustrial Terrazul**. Monorepo con backend NestJS y frontend Next.js.

---

## 🛠️ Stack

| Capa | Tecnología |
|------|------------|
| Backend | NestJS 10 + TypeORM + PostgreSQL 15 |
| Frontend | Next.js 14 (App Router) + React 18 + Tailwind CSS |
| Auth | JWT con Passport |
| Infra | Docker + Docker Compose |
| Gestor de paquetes | pnpm 9 (workspaces) + Turborepo |

---

## 📋 Requisitos previos

- **Node.js** >= 20.0.0
- **pnpm** >= 9.12.0 → `npm install -g pnpm`
- **Docker** y **Docker Compose** (para la base de datos)

---

## 🚀 Levantar en local (modo desarrollo)

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd valleflor
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

Copia los archivos de ejemplo y ajusta los valores según tu entorno local:

```bash
# API (backend)
cp apps/api/.env.example apps/api/.env

# Web (frontend)
cp apps/web/.env.example apps/web/.env
```

Variables clave en `apps/api/.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=floricultura_db
JWT_SECRET=cambiar_esto_en_produccion_min_32_chars
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:3000
ADMIN_EMAIL=admin@valleflor.com
ADMIN_PASSWORD=admin123
```

Variables clave en `apps/web/.env`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=cambiar_esto_en_produccion
```

### 4. Levantar la base de datos con Docker

```bash
docker compose up postgres -d
```

Esto inicia **PostgreSQL 15** en `localhost:5432` con la base de datos `floricultura_db`.

### 5. Ejecutar el proyecto completo

```bash
pnpm dev
```

> Este comando ejecuta en paralelo el API (`apps/api`) y el Frontend (`apps/web`) usando Turborepo.

| Servicio | URL |
|----------|-----|
| 🌐 Frontend (Next.js) | http://localhost:3000 |
| ⚙️ API (NestJS) | http://localhost:3001 |
| 📄 Swagger / Docs | http://localhost:3001/docs |

---

## ▶️ Comandos disponibles

### Desde la raíz del monorepo

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Inicia todos los servicios en modo desarrollo (hot-reload) |
| `pnpm build` | Compila todos los paquetes y aplicaciones |
| `pnpm lint` | Ejecuta el linter en todo el monorepo |
| `pnpm typecheck` | Verifica tipos TypeScript en todo el monorepo |
| `pnpm test` | Ejecuta los tests (BDD/Cucumber) |
| `pnpm clean` | Elimina los artefactos de compilación (`dist`, `.next`) |

### Solo el API (backend)

```bash
pnpm --filter @floricultura/api dev
```

### Solo el Web (frontend)

```bash
pnpm --filter @floricultura/web dev
```

---

## 🐳 Levantar con Docker Compose (stack completo)

Si prefieres correr todo en contenedores:

```bash
docker compose up --build
```

Esto levanta PostgreSQL + API + Web en sus respectivos puertos.

---

## 🧪 Ejecutar tests BDD

```bash
pnpm test
# o directamente en el API:
pnpm --filter @floricultura/api test:bdd
```

Los reportes HTML se generan en `apps/api/cucumber-report.html`.

---

## 📁 Estructura del proyecto

```
valleflor/
├── apps/
│   ├── api/          # Backend — NestJS
│   └── web/          # Frontend — Next.js
├── packages/         # Paquetes compartidos (shared-types, etc.)
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```
