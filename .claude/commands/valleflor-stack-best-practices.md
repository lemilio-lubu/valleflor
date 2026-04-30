---
name: valleflor-stack-best-practices
description: Buenas prácticas para el monorepo Valleflor — backend NestJS 10 + PostgreSQL 15 + TypeORM + Passport/JWT + Bcrypt + class-validator (apps/api) y frontend Next.js 14 + React 18 + Tailwind (apps/web), TypeScript y Docker Compose. Usa SIEMPRE que el usuario trabaje en este monorepo, mencione apps/api o apps/web, escriba o modifique código NestJS (módulos, controllers, services, DTOs, guards, interceptors, pipes, entities, migraciones, repositorios, decoradores), JWT/auth/hashing, configuración Docker, componentes de Next.js App Router, server/client components, fetching, estilos Tailwind — incluso si no dice "buenas prácticas". También aplica a code review, refactor, debugging, diseño de features y testing.
---

# Buenas Prácticas — Stack Valleflor

Skill maestra para trabajar correctamente en el monorepo Valleflor. Define convenciones, patrones y reglas no negociables para los dos paquetes principales y la infraestructura compartida.

## Stack del Proyecto

**Monorepo**:
```
valleflor/
├── apps/
│   ├── api/      # Backend NestJS
│   └── web/      # Frontend Next.js
├── docker-compose.yml
├── .env.example
└── package.json  # workspaces
```

**Backend (`apps/api`)**:
- NestJS 10 + TypeScript
- PostgreSQL 15 + TypeORM
- Passport + JWT
- Bcrypt (hashing)
- class-validator + class-transformer

**Frontend (`apps/web`)**:
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS + PostCSS

**Infra**: Docker + Docker Compose. Gestor: npm 10 (workspaces).

---

## Cómo Usar Esta Skill

Esta skill se divide en archivos de referencia por dominio. **Siempre** lee la referencia correspondiente antes de escribir código:

| Tarea del usuario | Referencia a leer |
|-------------------|-------------------|
| Crear/modificar módulos, controllers, services, providers, guards, interceptors, pipes, exception filters | `references/nestjs.md` |
| Diseñar DTOs, validación, transformación de entradas/salidas | `references/nestjs.md` (sección DTOs) |
| Crear entities, repositorios, migraciones, queries con TypeORM | `references/typeorm-postgres.md` |
| Implementar login, registro, JWT, refresh tokens, hashing, guards de roles | `references/auth-security.md` |
| Trabajar en `apps/web` (componentes, rutas, fetching, estilos) | `references/nextjs-frontend.md` |
| Configurar Dockerfile, docker-compose, variables de entorno, scripts de npm | `references/infra-docker.md` |
| Estructura de carpetas, naming, organización del monorepo | continúa leyendo este SKILL.md |
| Testing (unit, integration, e2e) | `references/testing.md` |

Para tareas que cruzan dominios (ej. "crear módulo de usuarios con autenticación y endpoints expuestos al frontend"), lee **todas** las referencias relevantes antes de empezar.

---

## Reglas No Negociables (Aplican a Todo)

Estas reglas nunca se rompen, sin importar el contexto:

1. **TypeScript estricto**. `tsconfig.json` con `"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`. Prohibido `any` salvo casos justificados con comentario `// eslint-disable-next-line` y razón.

2. **No commitear secretos**. Variables sensibles solo en `.env` (no commiteado). Mantener `.env.example` con todas las variables requeridas y valores ficticios.

3. **Validación en todos los bordes**. Toda entrada externa (HTTP, env vars, mensajes de cola) se valida antes de procesarse. Backend con `class-validator`; env vars con esquema (Joi o Zod) al arrancar.

4. **Errores tipados, nunca strings sueltos**. No usar `throw new Error('algo falló')`. Crear excepciones específicas (`UserNotFoundException`, `InvalidCredentialsException`). En Nest, extender de `HttpException` solo en la capa de presentación; el dominio lanza errores de dominio que un filtro convierte a HTTP.

5. **Logs estructurados con correlation ID**. Toda request HTTP genera un correlation ID que se propaga por todos los logs de esa transacción. Logs en JSON en producción.

6. **Inyección de dependencias siempre**. Nunca instanciar servicios con `new` dentro de otra clase. Usar el contenedor de Nest. En frontend, usar React Context o composición de hooks.

7. **Tests acompañan al código**. Toda función pública nueva tiene al menos un test. PRs sin tests no se aprueban salvo justificación explícita.

8. **Lint + format obligatorios**. ESLint + Prettier corren en pre-commit (Husky + lint-staged). CI bloquea merges si fallan.

9. **Naming consistente**:
   - Carpetas y archivos: `kebab-case` (`user-profile.service.ts`).
   - Clases: `PascalCase` (`UserProfileService`).
   - Variables y funciones: `camelCase`.
   - Constantes globales: `SCREAMING_SNAKE_CASE`.
   - Tipos/interfaces: `PascalCase` sin prefijo `I` (`User`, no `IUser`).
   - Archivos por tipo: `*.controller.ts`, `*.service.ts`, `*.module.ts`, `*.entity.ts`, `*.dto.ts`, `*.guard.ts`, `*.spec.ts`, `*.e2e-spec.ts`.

10. **Imports absolutos en cada paquete**. Configurar `paths` en `tsconfig.json`:
    - En `apps/api`: `@/modules/users/...` o `src/modules/users/...`.
    - En `apps/web`: `@/components/...`, `@/lib/...`.
    - Nunca rutas relativas profundas como `../../../../shared/utils`.

11. **No mezclar capas**. Backend respeta separación dominio → aplicación → infraestructura (ver `references/nestjs.md`). Frontend separa server components de client components conscientemente.

12. **Commits convencionales**. Formato `feat(api): agregar endpoint de usuarios`, `fix(web): corregir hidratación`, `chore`, `docs`, `refactor`, `test`. Facilita changelogs y semantic-release.

---

## Estructura del Monorepo

```
valleflor/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── modules/          # Módulos de dominio (users, orders, products, ...)
│   │   │   ├── shared/           # Utilidades transversales
│   │   │   ├── config/           # Configuración tipada y validada
│   │   │   ├── common/           # Filtros, interceptors, decorators globales
│   │   │   ├── database/         # Datasource, migraciones
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/                 # E2E tests
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/
│       ├── src/
│       │   ├── app/              # App Router de Next.js
│       │   ├── components/       # Componentes reutilizables
│       │   ├── features/         # Features por dominio (mirroring del backend)
│       │   ├── lib/              # Clientes API, utilidades
│       │   ├── hooks/            # Hooks compartidos
│       │   └── styles/           # globals.css, tailwind layers
│       ├── public/
│       ├── Dockerfile
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       └── package.json
│
├── packages/                     # Solo si se necesita código compartido
│   └── shared-types/             # Tipos compartidos api ↔ web (opcional)
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
├── .editorconfig
├── package.json                  # workspaces + scripts root
└── README.md
```

**Reglas del monorepo**:

- Cada `apps/*` es independiente: tiene su propio `package.json`, `tsconfig.json`, `Dockerfile`.
- Si necesitas compartir tipos entre `api` y `web`, créalos en `packages/shared-types` y publícalos como dependencia local. **Nunca** importes desde `apps/web` hacia `apps/api` o viceversa.
- Scripts del root (`package.json` raíz) orquestan los workspaces:
  ```json
  {
    "scripts": {
      "dev": "npm run dev --workspaces --if-present",
      "build": "npm run build --workspaces --if-present",
      "test": "npm run test --workspaces --if-present",
      "lint": "npm run lint --workspaces --if-present"
    }
  }
  ```

---

## Configuración de TypeScript Compartida

Crear un `tsconfig.base.json` en la raíz que extiendan los proyectos:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

Cada app extiende y ajusta lo específico (en frontend `module: esnext`, `jsx: preserve`, etc.).

---

## Variables de Entorno

- Único `.env.example` en la raíz con todas las variables. Cada app lee solo las suyas.
- Backend valida sus env vars al arrancar con `class-validator` (ver `references/nestjs.md`, sección Config).
- Frontend Next.js: solo variables prefijadas con `NEXT_PUBLIC_` se exponen al cliente. Las demás son server-only.
- Nunca leer `process.env.X` directamente desde código de negocio. Usar el servicio de configuración tipado.

Variables mínimas esperadas:

```bash
# Postgres
POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=valleflor
POSTGRES_PASSWORD=changeme
POSTGRES_DB=valleflor

# API
API_PORT=3001
API_NODE_ENV=development
JWT_ACCESS_SECRET=replace_with_long_random_string
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=replace_with_another_long_random_string
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN=http://localhost:3000

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001
WEB_PORT=3000
```

---

## Flujo de Trabajo Estándar

Antes de ejecutar tareas en este stack, sigue este orden:

1. **Identifica el dominio**: ¿es backend, frontend, infra o cross-cutting?
2. **Lee la(s) referencia(s)** correspondiente(s) en `references/`.
3. **Ubica el código existente**: revisa cómo se hicieron tareas similares en el repo. Mantén la consistencia por encima de tu opinión personal.
4. **Implementa siguiendo los patrones** de la referencia.
5. **Escribe los tests** correspondientes.
6. **Verifica**: lint, build, tests verdes localmente antes de commit.

Si un patrón existente en el repo contradice esta skill, **señala la discrepancia al usuario** antes de imponer la regla nueva: puede haber razones contextuales para la inconsistencia.

---

## Anti-patrones Prohibidos en Todo el Stack

- `any` sin justificación. Usa `unknown` y reduce el tipo.
- `console.log` en código de producción. Usa el logger inyectado.
- Lógica de negocio dentro de controllers (backend) o componentes (frontend). Extraer a services/hooks.
- Acceso directo a `process.env` fuera del módulo de configuración.
- Imports relativos profundos (`../../../`). Usa alias.
- Funciones de más de 50 líneas o con más de 4 parámetros sin razón. Refactoriza.
- Mutación de objetos pasados por parámetro (mutación implícita). Trabaja inmutablemente.
- Promesas sin manejar (`floating promises`). Siempre `await` o `.catch()`.
- Catch que silencia errores: `catch (e) {}`. Si capturas, **haz algo** (loggear, transformar, relanzar).
- Endpoints que devuelven entities directamente (filtran datos sensibles como `passwordHash`). Usa response DTOs.
- Componentes React que hacen fetch en `useEffect` cuando podrían ser server components.
- Tailwind con clases mágicas hex (`bg-[#1B3FA0]`). Usar tokens del theme.

---

## Cuándo Pedir Aclaración al Usuario

Detente y pregunta antes de proceder si:

- El usuario pide algo que contradice una regla no negociable de esta skill.
- Hay ambigüedad sobre si una funcionalidad va en backend, frontend o ambos.
- El cambio afecta el contrato de la API y rompería compatibilidad.
- Se requiere instalar una dependencia nueva que duplica funcionalidad de algo ya presente.
- La feature requiere cambios de schema de BD: confirmar si crear migración o sincronizar.

---

## Referencias

- `references/nestjs.md` — Arquitectura, módulos, DI, DTOs, pipes, guards, interceptors, filters, config tipada.
- `references/typeorm-postgres.md` — Entities, repositorios, migraciones, transacciones, índices, soft delete.
- `references/auth-security.md` — JWT (access + refresh), Bcrypt, Passport strategies, guards de roles, OWASP top 10 aplicado.
- `references/nextjs-frontend.md` — App Router, server vs client components, fetching, Tailwind, theme, formularios.
- `references/infra-docker.md` — Dockerfiles multi-stage, docker-compose, healthchecks, redes, volúmenes.
- `references/testing.md` — Estrategia de testing por capa, Jest, supertest, Testing Library, mocks vs fakes.
