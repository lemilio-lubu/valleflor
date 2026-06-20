# Referencia: Pruebas BDD con Gherkin + Cucumber.js (`apps/api`)

Referencia para la IA. Define cómo está montado el harness BDD y **cómo extenderlo** sin romper convenciones. Análogo a `behave` (Python): `.feature` en Gherkin + step definitions en TypeScript.

> Esta es la **única** infraestructura de testing del proyecto. No introducir Jest/Vitest/Mocha para el backend sin que el usuario lo pida; usar este harness. La guía orientada a humanos vive en `apps/api/features/README.md`.

## Stack y comandos

- `@cucumber/cucumber` (runner) + `@nestjs/testing` (levanta `AppModule` en memoria) + `supertest` (HTTP in-process) + `ts-node` (ejecuta steps `.ts`) + `expect` (aserciones, sin Jest) + `dotenv`.
- Correr: `pnpm --filter @floricultura/api test` (transpile-only, rápido) o `test:bdd` (con type-check). Config: `apps/api/cucumber.cjs`. Reporte: `apps/api/cucumber-report.html`.
- En CI corre como gate (`.github/workflows/ci.yml`, job `test`) con Postgres de servicio.

## Layout

```
apps/api/
├── cucumber.cjs              # config; el ORDEN de `require` importa (env primero)
└── features/
    ├── *.feature             # escenarios, en kebab-case por dominio
    ├── steps/*.steps.ts      # step definitions (compartidos entre todos los features)
    └── support/              # infraestructura — modificar solo con intención
        ├── env.ts            # carga .env.test + overrides + guard de BD
        ├── test-app.ts       # createTestApp(): replica globals de main.ts
        ├── app-holder.ts     # getApp() / getDataSource() (singleton)
        ├── world.ts          # VfWorld: { app, token?, response? }
        ├── db.ts             # truncateAll(ds), seedAdmin(ds), ADMIN_EMAIL/PASSWORD
        └── hooks.ts          # BeforeAll(crear app) / Before(truncate+seed) / AfterAll(close)
```

## Cómo agregar un feature (procedimiento para la IA)

1. **Crear `apps/api/features/<dominio>.feature`** con `# language: es` en la primera línea. Un archivo por dominio/recurso. Usar `Antecedentes:` para precondiciones comunes (típicamente autenticación).
2. **Crear/editar `apps/api/features/steps/<dominio>.steps.ts`**. Antes de escribir un step nuevo, revisar `steps/` por uno reutilizable (los steps son globales).
3. **Implementar cada step** con el patrón: `When` ejecuta la petición y guarda `this.response`; `Then` asevera sobre `this.response`.
4. **Verificar** con `pnpm --filter @floricultura/api test` y confirmar `N scenarios (N passed)`.

### Patrón canónico de un step

```ts
import { When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

When('creo un producto con código {string} y nombre {string}',
  async function (this: VfWorld, codigo: string, nombre: string) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/productos')                       // SIEMPRE prefijo /api/v1
      .set('Authorization', `Bearer ${this.token}`)    // el hook Before deja el JWT
      .send({ codigo, nombre });
  });

Then('la respuesta tiene estado {int}', function (this: VfWorld, status: number) {
  expect(this.response!.status).toBe(status);
});
```

## Invariantes que la IA debe respetar

- **Tipar `this` como `VfWorld`** en cada callback (`function (this: VfWorld, ...)`, nunca arrow function — Cucumber liga el World a `this`).
- **Prefijo `/api/v1`** en todas las rutas (por `setGlobalPrefix`).
- **Aserciones con `expect` de `'expect'`**, no de Jest ni `node:assert` (consistencia).
- **Autenticación**: es **automática**. El hook `Before` (`support/hooks.ts`) hace login como admin y deja el JWT en `this.token`. No escribir un paso de login (es incidental); solo usar `.set('Authorization', \`Bearer ${this.token}\`)` en los steps que lo necesiten.
- **Aislamiento garantizado**: `hooks.ts` hace `truncateAll` + `seedAdmin` en `Before` de cada escenario. No escribir lógica de limpieza en los steps. No asumir estado entre escenarios.
- **Datos del escenario** (fincas, semanas, responsables): crearlos dentro de un step `Dado`, vía la API o `getDataSource().query(...)`.
- **BD**: siempre `floricultura_test`. `env.ts` aborta si `DATABASE_NAME !== 'floricultura_test'`. No tocar `floricultura_db`.
- **No modificar `support/`** para agregar un feature normal; solo si cambia la infraestructura (ej. nuevo helper de seed transversal).

## Gotchas conocidos

- `env.ts` **debe** cargarse antes que cualquier import de `AppModule` (ya garantizado por el orden en `cucumber.cjs`). Si se reordena, las pruebas apuntarían a la BD de dev (el guard lo frena).
- Config en **CommonJS** (`cucumber.cjs` + `ts-node/register`). `apps/api` no es `"type":"module"`. No migrar a ESM sin actualizar el loader.
- El esquema usa `uuid_generate_v4()`; en entornos nuevos (CI) hay que `CREATE EXTENSION "uuid-ossp"` antes de sincronizar (el workflow ya lo hace; en local la BD ya la tiene).
- Logging verboso de TypeORM en la salida: es por `NODE_ENV=development` (necesario para activar `synchronize`). No es un error.
