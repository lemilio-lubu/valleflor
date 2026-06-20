# Guía de pruebas BDD (Gherkin + Cucumber.js) — `apps/api`

Esta guía es para **desarrolladores**. Explica dónde colocar los archivos `.feature` y qué proceso seguir para programar las pruebas (step definitions) de cada paso.

> El equivalente en este proyecto a `behave` (Python) es **Cucumber.js**. Escribes el comportamiento en español en un `.feature` y luego implementas cada paso en TypeScript.

---

## 1. Estructura de carpetas

Todo vive bajo `apps/api/features/`:

```
apps/api/features/
├── <capacidad>/           # ① Features agrupadas POR CAPACIDAD de negocio
│   └── *.feature          #    los escenarios en Gherkin (español)
├── steps/                 # ② Las implementaciones de cada paso (Given/When/Then)
│   └── *.steps.ts
└── support/               # ③ Infraestructura compartida (NO tocar para features nuevas)
    ├── env.ts             #    fija el entorno de test (BD floricultura_test)
    ├── test-app.ts        #    arranca la app Nest en memoria
    ├── app-holder.ts      #    singleton de la app + DataSource
    ├── world.ts           #    estado por escenario (app, token, adminToken, tokens, response, ids)
    ├── db.ts              #    truncateAll + seedAdmin
    └── hooks.ts           #    BeforeAll/Before/AfterAll (login admin + reloj congelado)
```

Capacidades actuales: `configuracion-de-la-operacion/` (fincas, responsables, catálogo, asignación
productiva, semanas, carga masiva), `produccion-diaria/` (registros) y `produccion-semanal/`
(base semanal/estimados, consolidado).

Ejemplo real: `apps/api/features/configuracion-de-la-operacion/fincas.feature`.

### ¿Dónde coloco un `.feature` nuevo?

- **Organízalos por capacidad de negocio**: `features/<capacidad>/<nombre>.feature` (ej. `configuracion-de-la-operacion/fincas.feature`). **Nunca** por historia de usuario ni por release.
- Nombre en `kebab-case` por **dominio/recurso**: `fincas.feature`, `catalogo.feature`, `responsables.feature`.
- Un `.feature` por área funcional. No mezclar dominios distintos en el mismo archivo.
- El glob de Cucumber (`features/**/*.feature`) los descubre en cualquier subcarpeta; los steps viven siempre en `features/steps/` (planos, compartidos).

### ¿Dónde van los steps?

- En `apps/api/features/steps/`, normalmente un archivo por feature: `fincas.feature` → `steps/fincas.steps.ts`.
- Los steps **se comparten entre todos los features**: un step definido en cualquier archivo sirve para todos. Por eso conviene tener pasos reutilizables (ej. `fincas.steps.ts` define `Dado que la finca "..." está registrada`, que reutilizan responsables y vinculación).

---

## 2. Proceso para agregar una prueba nueva

### Paso 1 — Escribe el `.feature`

Crea `apps/api/features/<capacidad>/<dominio>.feature`. Empieza **siempre** con `# language: es` para usar `Característica/Escenario/Dado/Cuando/Entonces/Y`.

```gherkin
# language: es
Característica: Gestión de semanas
  Como administrador
  Quiero crear semanas de estimación
  Para registrar la producción

  Escenario: Crear una semana
    Cuando el administrador crea la semana número 23 del año 2026
    Entonces la semana 23 de 2026 queda disponible
```

- La autenticación como **admin es automática**: el hook `Before` (`support/hooks.ts`) hace login y deja el JWT en `this.token`. No escribas un paso de login (es incidental); úsalo directo en tus steps con `.set('Authorization', \`Bearer ${this.token}\`)`.
- Escribe los pasos en **lenguaje de negocio** (declarativo): el `.feature` describe el comportamiento; las aserciones técnicas (status HTTP, etc.) viven en los step definitions.
- `Antecedentes` (Background) corre antes de cada escenario del archivo.
- Usa `Esquema del escenario` + `Ejemplos` si quieres parametrizar con una tabla.

### Paso 2 — Genera los snippets de los steps faltantes

Corre las pruebas; Cucumber imprime el **código sugerido** para cada step que aún no existe:

```bash
pnpm --filter @floricultura/api test
```

Verás algo como:

```
? Cuando el administrador crea la semana número 23 del año 2026
  Undefined. Implement with the following snippet:

    When('el administrador crea la semana número {int} del año {int}', async function (numero, anio) {
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
  'el administrador crea la semana número {int} del año {int}',
  async function (this: VfWorld, numero: number, anio: number) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/semanas')
      .set('Authorization', `Bearer ${this.token}`) // el hook Before deja el JWT
      .send({ numeroSemana: numero, anio });
  },
);

// Declarativo: el Then expresa el resultado de negocio; la aserción HTTP vive aquí.
Then(
  'la semana {int} de {int} queda disponible',
  function (this: VfWorld, _numero: number, _anio: number) {
    expect(this.response!.status).toBe(201);
  },
);
```

Cosas clave que ya te da la infraestructura (no las reimplementes):

| Necesitas… | Cómo |
|------------|------|
| La app HTTP | `this.app.getHttpServer()` (supertest) |
| Estar autenticado | **automático**: el hook `Before` hace login admin y deja el JWT en `this.token` (también en `this.adminToken`) |
| Actuar como un responsable | usa el step `Dado que {word} ha iniciado sesión` (`steps/auth.steps.ts`): hace login con `<persona>@valleflor.com` y deja su token en `this.tokens[persona]`. Helper `tokenDe(world, persona)`. Necesario para crear semanas y estimar (esas acciones exigen ser responsable, no admin) |
| BD limpia por escenario | automático (`hooks.ts` hace TRUNCATE + seed admin antes de cada escenario) |
| Tiempo determinista | el `hooks.ts` fija el reloj de la app en la **semana ISO 25 de 2026** vía `setNowProvider` (seam `src/common/clock.ts`, usado por `getCurrentISOWeek`). Así "semana actual" es estable y puedes probar bordes (semana 40 = futura, 20 = pasada). NO se fakea el `Date` global (eso da flakiness en este harness in-process) |
| Recordar recursos entre steps | guárdalos en `this.ids` por clave lógica. Convenciones útiles para el core: `finca:<nombre>`, `responsable:<persona>`, `fincaDe:<persona>`, `semana:<persona>`, `producto`/`variedad`/`color` del último ítem de catálogo |
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
- **Reloj fijo**: el tiempo está congelado en la semana ISO 25 de 2026. Para escenarios que dependan de la semana actual, deriva el número con `getCurrentISOWeek()` en el step (no lo hardcodees); para semanas pasadas/futuras usa números explícitos relativos a la 25.
- **Una corrida a la vez**: las pruebas comparten la BD `floricultura_test` y la truncan por escenario. NO ejecutes dos corridas (`test`/`test:bdd`) en paralelo: se pisan los TRUNCATE y verás fallos intermitentes (carrera de datos), no bugs reales.

---

## 4. Problemas comunes

| Síntoma | Causa / solución |
|---------|------------------|
| `Undefined step` | El texto del `.feature` no coincide con ningún step. Copia el snippet sugerido. |
| Cuelga / `database "floricultura_test" does not exist` | Falta crear la BD: `createdb ... floricultura_test`. |
| `401` inesperado | Falta el `.set('Authorization', \`Bearer ${this.token}\`)` en el step (el `Before` ya deja `this.token`). |
| `relation ... does not exist` | La entidad no está en el glob de TypeORM o la BD de test quedó en mal estado: bórrala y deja que synchronize la recree. |
| Fallos intermitentes que cambian de escenario | Casi siempre hay **otra corrida de pruebas activa** (o un proceso `cucumber` huérfano) compartiendo la BD. Mátalos (`pkill -f cucumber`) y vuelve a correr una sola vez. |
| Un escenario depende de la fecha real y rompe en otra semana | No uses `new Date()`/números de semana hardcodeados; el reloj está fijo (semana 25/2026) vía `src/common/clock.ts`. Deriva con `getCurrentISOWeek()`. |
| Quiero ver el detalle del fallo | Abre `cucumber-report.html` o corre con `test:bdd`. |

Referencia completa de la infraestructura: `.claude/commands/references/bdd-cucumber.md`.
