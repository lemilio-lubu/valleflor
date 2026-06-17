# Proyecto — Valleflor / Terrazul

Contexto productivo y convenciones: ver `CLAUDE.md` en la raíz y `.claude/guidelines/`.

- **Backend**: NestJS 10 + TypeORM + PostgreSQL 15 (`apps/api`)
- **Frontend**: Next.js 14 App Router + React 18 + Tailwind (`apps/web`)
- **Auth**: JWT (Passport) · **Infra**: Docker Compose · **Paquetes**: npm workspaces

## Dominio

Administración de fincas, responsables y asignaciones productivas. Las estimaciones
diarias y semanales se generan sobre la estructura: Finca → Responsable → (Producto →
Variedad → Color). Los registros diarios y la base semanal referencian `color`.

## Artefactos SDD

Backend de persistencia: **openspec** (archivos versionados en git). Engram no está
disponible en este entorno.
