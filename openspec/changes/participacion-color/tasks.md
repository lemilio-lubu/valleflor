# Tasks: Participación por Color

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 350–480 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: backend service + controller + BDD | PR 2: frontend page + table + nav |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | API endpoint + BDD tests | PR 1 | Self-contained; frontend can mock against it |
| 2 | Frontend page + table + nav | PR 2 | Depends on PR 1 merged; targets main after PR 1 |

---

## Phase 1: Backend Types and Service Method

- [ ] 1.1 `apps/api/src/consolidado/consolidado.service.ts` — add `ParticipacionColorRawRow` type and `ParticipacionColorRow` interface at file top (before existing types)
- [ ] 1.2 `apps/api/src/consolidado/consolidado.service.ts` — add `getParticipacionColor(semanaInicio?, semanaFin?, anio?)` method using `this.baseSemanalRepo.manager.query<ParticipacionColorRawRow[]>` with the designed SQL; map: numero_semana null → 0, Number() coercion for cajas_reales, participacion null → null

## Phase 2: Backend Controller Route

- [ ] 2.1 `apps/api/src/consolidado/consolidado.controller.ts` — add `@Get('participacion-color')` route calling `consolidadoService.getParticipacionColor`; use `ParseIntPipe({ optional: true })` for semanaInicio, semanaFin, anio; no per-route guard needed (class-level `@Roles(UserRole.ADMIN)` already applies)

## Phase 3: BDD Feature File and Step Definitions

> WARNING — HIGHEST-RISK ITEM: Scenario 2 (sum invariant) requires seeded data where
> SUM(cajas_reales) per (producto, semana) is exactly known. Seed values must be
> hardcoded constants — do not use random generation or the ±0.1 tolerance assertion
> will be flaky across test runs.

- [ ] 3.1 `apps/api/features/reportes/` (new directory) + `participacion-color.feature` — write all 7 scenarios from spec; Scenarios 1–5 are API-level; Scenarios 6–7 are UI render assertions (tag `@ui`, skip in API cucumber runner)
- [ ] 3.2 `apps/api/features/steps/participacion-color.steps.ts` — `When` step: admin calls GET `/api/v1/consolidado/participacion-color` with semanaInicio/semanaFin/anio query params; `Then` steps for: 200 + array shape matches `ParticipacionColorRow`, sum invariant (group by producto+semana, `Math.abs(sum - 100) <= 0.1`), division-by-zero row has `participacion: null`, no-data sentinel row has `numeroSemana: 0` and `participacion: null`, non-admin JWT returns 403
- [ ] 3.3 Seed in `apps/api/features/support/hooks.ts` (or a new `participacion-color.seed.ts` helper) — seed exactly 2 colors under 1 producto in 1 semana with known cajasReales (e.g., 60 and 40) so invariant sum is deterministic at 100.0; document the seed constants inline in the step file

## Phase 4: Frontend Navigation Entry

- [ ] 4.1 `apps/web/src/app/admin/layout.tsx` — add `PieChart` to lucide-react named imports; append nav item `{ href: '/admin/participacion', label: 'Participación', Icon: PieChart }` after the Consolidado entry (no dependency on other phases — can ship in either PR)

## Phase 5: Frontend Page Shell

- [ ] 5.1 `apps/web/src/app/admin/participacion/page.tsx` (new file) — `'use client'`; copy filter state pattern from `apps/web/src/app/admin/consolidado/page.tsx` (semanaInicio, semanaFin, anio controlled inputs + reset button); add `getCurrentWeekAndYear()` helper for default values; render `<ParticipacionColorTable semanaInicio={…} semanaFin={…} anio={…} />`; page title "Participación por Color"; subtitle "Porcentaje de cada color sobre el total real de su producto, por semana" (depends on: 4.1)

## Phase 6: Frontend Table Component

- [ ] 6.1 `apps/web/src/app/admin/participacion/components/ParticipacionColorTable.tsx` (new file) — define types: `FlatRow`, `SemanaPart { cajasReales: number; participacion: number | null }`, `PivotRowP`, `ProductGroup`; implement `pivotParticipacion(flat: FlatRow[])` skipping rows where `numeroSemana === 0`; implement `groupByProducto()` (depends on: 5.1)
- [ ] 6.2 Same file — add `useQuery` with key `['participacion-color', semanaInicio, effectiveSemanaFin, anio]` calling `/api/v1/consolidado/participacion-color`; `WEEK_COUNT = 10` constant; `effectiveSemanaFin` guard (copy from `ConsolidadoSemanal.tsx`); `useTableScroll(220)` + `<FloatingScrollbar />` (depends on: 6.1)
- [ ] 6.3 Same file — render table: single header row (no Est./Real split — participation is real-only); sticky columns Producto (left-0), Variedad (left-130px), Color (left-250px with scroll shadow); week cells: `participacion !== null ? \`${participacion.toFixed(1)}%\` : <span className="text-carbon-700">—</span>`; percentage values use `text-agro-500`; group header rows show absolute `cajasReales` per week (not percentages); no `<tfoot>` grand total; omit `nombreComercial` column entirely (depends on: 6.2)
- [ ] 6.4 Same file — animation: table rows entering stagger `opacity: 0→1` + `translateY(4px→0)` at 30ms intervals, 200ms ease-out; loading state renders skeleton rows; empty state "Sin datos de participación para el rango seleccionado" with fade-in 150ms ease-out; wrap hover transitions in `@media (hover: hover) and (pointer: fine)`; wrap movement in `@media (prefers-reduced-motion: reduce)` removing translateY but keeping opacity; no `transition: all`, no starting state `scale(0)`, no `ease-in` anywhere (depends on: 6.3)
