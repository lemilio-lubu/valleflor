# Guía de pruebas BDD (Gherkin + Cucumber.js) — `apps/api`

Esta guía es para **desarrolladores**. Explica dónde colocar los archivos `.feature` y qué proceso seguir para programar las pruebas (step definitions) de cada paso.

> El equivalente en este proyecto a `behave` (Python) es **Cucumber.js**. Escribes el comportamiento en español en un `.feature` y luego implementas cada paso en TypeScript.

---

## 1. Estructura de carpetas

Todo vive bajo `apps/api/features/`:

```
apps/api/features/
├── *.feature              # ① Los escenarios en Gherkin (español)
├── steps/                 # ② Las implementaciones de cada paso (Given/When/Then)
│   └── *.steps.ts
└── support/               # ③ Infraestructura compartida (NO tocar para features nuevas)
    ├── env.ts             #    fija el entorno de test (BD floricultura_test)
    ├── test-app.ts        #    arranca la app Nest en memoria
    ├── app-holder.ts      #    singleton de la app + DataSource
    ├── world.ts           #    estado por escenario (app, token, response)
    ├── db.ts              #    truncateAll + seedAdmin
    └── hooks.ts           #    BeforeAll/Before/AfterAll
```

### ¿Dónde coloco un `.feature` nuevo?

- **Directamente en `apps/api/features/`** (ej. `apps/api/features/semanas.feature`).
- Nombre en `kebab-case` y por **dominio/recurso**: `productos.feature`, `colores.feature`, `estimaciones.feature`.
- Un `.feature` por área funcional. No mezclar dominios distintos en el mismo archivo.

### ¿Dónde van los steps?

- En `apps/api/features/steps/`, normalmente un archivo por feature: `productos.feature` → `steps/productos.steps.ts`.
- Los steps **se comparten entre todos los features**: un step `Cuando consulto los productos sin token` definido en cualquier archivo sirve para todos. Por eso conviene tener pasos reutilizables (ej. `auth.steps.ts` con la autenticación).

---

## 2. Proceso para agregar una prueba nueva

### Paso 1 — Escribe el `.feature`

Crea `apps/api/features/<dominio>.feature`. Empieza **siempre** con `# language: es` para usar `Característica/Escenario/Dado/Cuando/Entonces/Y`.

```gherkin
# language: es
Característica: Gestión de semanas
  Como administrador
  Quiero crear semanas de estimación
  Para registrar la producción

  Antecedentes:
    Dado que estoy autenticado como admin

  Escenario: Crear una semana
    Cuando creo una semana número 23 del año 2026
    Entonces la respuesta tiene estado 201
```

- `Antecedentes` (Background) corre antes de cada escenario del archivo.
- Usa `Esquema del escenario` + `Ejemplos` si quieres parametrizar con una tabla.

### Paso 2 — Genera los snippets de los steps faltantes

Corre las pruebas; Cucumber imprime el **código sugerido** para cada step que aún no existe:

```bash
pnpm --filter @floricultura/api test
```

Verás algo como:

```
? Cuando creo una semana número 23 del año 2026
  Undefined. Implement with the following snippet:

    When('creo una semana número {int} del año {int}', async function (numero, anio) {
      // Write code here that turns the phrase above into concrete actions
      return 'pending';
    });
```

Copia ese snippet a tu archivo de steps.

### Paso 3 — Implementa cada step en `steps/<dominio>.steps.ts`

Patrón estándar: **When** hace la petición HTTP y guarda la respuesta en el `World`; **Then** hace las aserciones.

```ts
import { When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

When(
  'creo una semana número {int} del año {int}',
  async function (this: VfWorld, numero: number, anio: number) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/semanas')
      .set('Authorization', `Bearer ${this.token}`) // token lo deja auth.steps.ts
      .send({ numeroSemana: numero, anio });
  },
);

Then('la respuesta tiene estado {int}', function (this: VfWorld, status: number) {
  expect(this.response!.status).toBe(status);
});
```

Cosas clave que ya te da la infraestructura (no las reimplementes):

| Necesitas… | Cómo |
|------------|------|
| La app HTTP | `this.app.getHttpServer()` (supertest) |
| Estar autenticado | `Dado que estoy autenticado como admin` → deja el JWT en `this.token` |
| BD limpia por escenario | automático (`hooks.ts` hace TRUNCATE + seed admin antes de cada escenario) |
| Recordar la respuesta entre steps | guárdala en `this.response` |
| Aserciones | `import { expect } from 'expect'` (matchers tipo Jest) |

> **Prefijo de rutas**: todas las rutas llevan `/api/v1/...` (el `setGlobalPrefix`). No lo olvides.

### Paso 4 — Corre y verifica

```bash
pnpm --filter @floricultura/api test       # rápido (sin type-check)
pnpm --filter @floricultura/api test:bdd   # con type-check de los steps
```

Salida esperada: `N scenarios (N passed)`. Si un step queda en `pending` o `undefined`, falta implementarlo. Se genera además `cucumber-report.html`.

---

## 3. Reglas y convenciones

- **BD de pruebas**: las pruebas usan **`floricultura_test`** (NO `floricultura_db`). Créala una vez:
  ```bash
  createdb -h localhost -U <tu_usuario> floricultura_test
  ```
  El esquema lo crea TypeORM solo (synchronize). Hay un guard que aborta si la BD no es la de test.
- **Aislamiento**: cada escenario empieza con la BD vacía + un admin sembrado (`admin@valleflor.com` / `admin1234`). No asumas datos de escenarios anteriores.
- **Datos propios del escenario**: si una prueba necesita una finca/semana/responsable, créalos en un step `Dado` (vía la API o el `DataSource`), no dependas de seeds globales.
- **Steps reutilizables**: antes de escribir un step nuevo, revisa si ya existe uno equivalente en `steps/`.
- **Parámetros**: usa `{string}`, `{int}`, `{float}` en el texto del step para capturar valores.

---

## 4. Problemas comunes

| Síntoma | Causa / solución |
|---------|------------------|
| `Undefined step` | El texto del `.feature` no coincide con ningún step. Copia el snippet sugerido. |
| Cuelga / `database "floricultura_test" does not exist` | Falta crear la BD: `createdb ... floricultura_test`. |
| `401` inesperado | Falta `Dado que estoy autenticado como admin` o el `.set('Authorization', ...)`. |
| `relation ... does not exist` | La entidad no está en el glob de TypeORM o la BD de test quedó en mal estado: bórrala y deja que synchronize la recree. |
| Quiero ver el detalle del fallo | Abre `cucumber-report.html` o corre con `test:bdd`. |

Referencia completa de la infraestructura: `.claude/commands/references/bdd-cucumber.md`.
