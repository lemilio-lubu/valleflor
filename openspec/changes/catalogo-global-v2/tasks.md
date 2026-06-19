# Tareas — Catálogo global V2

Orden por fases. Cada fase es un work-unit reviewable. `ask-on-risk`: si una fase supera
~400 líneas, partir en PRs encadenados.

## Fase 1 — Esquema y entidades ✅
- [x] 1.1 `Producto`: quitar `finca_id`/relación finca; agregar `codigo` (único), `longitud`, `tallos_por_caja`
- [x] 1.2 `Color`: eliminar `tallos_por_caja`, `codigo`, `nombre_original`
- [x] 1.3 `Finca`: quitar relación `productos`
- [x] 1.4 Unicidades: Producto(`codigo`, `nombre`), Variedad(`nombre`+`producto_id`), Color(`nombre`+`variedad_id`)
- [x] 1.5 Esquema en dev por `synchronize` (BD fresca / regenerar desde cero); bootstrap no requiere cambios

## Fase 2 — Backend cálculos y servicios de catálogo ✅
- [x] 2.1 Refactor lectura de caja: `color.variedad.producto.tallosPorCaja` (consolidado, base-semanal, semanas, registros, reconciliation)
- [x] 2.2 `productos.service.ts`: alta/edición global (sin finca), validar `codigo`/`nombre` únicos
- [x] 2.3 DTOs producto: agregar `codigo`, `longitud`, `tallosPorCaja`
- [x] 2.4 `colores.service.ts` + DTOs color: quitar `tallosPorCaja`/`codigo`/`nombreOriginal`; quitar relación/orden por finca
- [x] 2.5 `variedades.service.ts`: control de acceso sin `producto.fincaId`
- [x] 2.6 `productos.controller.ts`: `findAll` global (sin `fincaId`)
- [x] 2.7 `consolidado.service.ts`: SQL crudo → `p.tallos_por_caja`, `p.codigo`, sin `JOIN fincas`
- [x] 2.8 `configuracion.service.ts`: propagar caja global a productos
- [x] 2.9 Verificar tipos: `tsc` + `nest build`

## Fase 2B — Motor semanal scopeado por responsable ✅
- [x] 2B.1 `base_semanal`: agregar `responsable_id`; clave `(responsable_id, color_id, numero_semana, anio)`
- [x] 2B.2 `base-semanal.service.ts`: `recalcular`/`upsertEstimacion`/`resetSemana` incluyen `responsableId`
- [x] 2B.3 Scoping por finca en `findMatriz`/`findSemanaActual`/`limpiarEstimacionesSemana` vía responsable
- [x] 2B.4 `ventas.service.ts`: scoping por responsable/finca (no `producto.fincaId`)
- [x] 2B.5 `semana-reconciliation.service.ts` y `registros.service.ts`: caja desde producto
- [x] 2B.6 `semanas.service.ts`: quitar `producto.finca` del filtro/relations; caja desde producto; `resetSemana` con responsableId

## Fase 3 — Carga masiva ✅
- [x] 3.1 `admin.service.ts`: upsert producto por `codigo` global; set `longitud`/`caja`; color sin caja
- [x] 3.2 `BulkUploadCatalog.tsx`: plantilla CSV nueva (`CODIGO, PRODUCTO, LONGITUD, CAJA, VARIEDAD, COLOR, FINCA, RESPONSABLE`)

## Fase 4 — Vinculación granular (F4) ✅
- [x] 4.1 DTO `SetAsignacionesDto` con `{ productoIds?, variedadIds?, colorIds? }`
- [x] 4.2 `fincas.service.ts`: `setAsignacionesResponsable` expande selección mixta a `color_id` activos + `reconcileResponsable`
- [x] 4.3 Endpoint en `fincas.controller.ts`

## Fase 5 — Frontend catálogo global ✅
- [x] 5.1 `admin/catalogo/page.tsx`: quitar selector de finca (catálogo global)
- [x] 5.2 Columna de producto con meta `código · longitud · tallos/caja`
- [x] 5.3 Modal de producto con código/nombre/longitud/caja (crear y editar)
- [x] 5.4 `fincas/[id]/page.tsx`: tab Productos usa el catálogo global

## Fase 6 — Frontend asignación granular ✅
- [x] 6.1 Árbol producto/variedad/color con checkboxes tri-estado en `AsignarProductosModal`
- [x] 6.2 Postea `{ colorIds }` (granularidad fina); endpoint backend `GET .../colores` para preselección
- [x] 6.3 Toggle a nivel producto y variedad marca/desmarca todos sus colores

## Fase 7 — Verificación end-to-end (PENDIENTE)
- [ ] 7.1 Reset BD + re-import CSV nuevo
- [ ] 7.2 Validar consolidado diario/semanal con caja a nivel producto
- [ ] 7.3 Validar asignación parcial (variedad/color) y reconciliación de semanas
