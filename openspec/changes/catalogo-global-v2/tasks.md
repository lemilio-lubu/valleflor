# Tareas — Catálogo global V2

Orden por fases. Cada fase es un work-unit reviewable. `ask-on-risk`: si una fase supera
~400 líneas, partir en PRs encadenados.

## Fase 1 — Esquema y entidades
- [ ] 1.1 `Producto`: quitar `finca_id`/relación finca; agregar `codigo` (único), `longitud`, `tallos_por_caja`
- [ ] 1.2 `Color`: eliminar `tallos_por_caja`, `codigo`, `nombre_original`
- [ ] 1.3 `Finca`: quitar relación `productos`
- [ ] 1.4 Unicidades: Producto(`codigo`, `nombre`), Variedad(`nombre`+`producto_id`), Color(`nombre`+`variedad_id`)
- [ ] 1.5 `database-bootstrap.service.ts`: alta de columnas en producto, baja en color + reset limpio

## Fase 2 — Backend cálculos y servicios de catálogo
- [ ] 2.1 Refactor lectura de caja: `color.variedad.producto.tallosPorCaja` en consolidado, base-semanal, semanas, registros, reconciliation
- [ ] 2.2 `productos.service.ts`: alta/edición global (sin finca), validar `codigo`/`nombre` únicos
- [ ] 2.3 DTOs producto: agregar `codigo`, `longitud`, `tallosPorCaja`
- [ ] 2.4 `colores.service.ts` + DTOs color: quitar `tallosPorCaja`/`codigo`/`nombreOriginal`; quitar relación/orden por finca
- [ ] 2.5 `variedades.service.ts`: control de acceso sin `producto.fincaId`
- [ ] 2.6 `productos.controller.ts`: `findAll` global (sin `fincaId`)
- [ ] 2.7 Verificar tipos: `tsc` + `nest build`

## Fase 2B — Motor semanal scopeado por responsable (decisión validada)
- [ ] 2B.1 `base_semanal`: agregar `responsable_id`; clave `(responsable_id, color_id, numero_semana, anio)`
- [ ] 2B.2 `base-semanal.service.ts`: `recalcular`/`upsertEstimacion`/`resetSemana` incluyen `responsableId`
- [ ] 2B.3 Scoping por finca en `fetchRows`/`findMatriz`/`findSemanaActual`/`limpiarEstimacionesSemana` vía `ResponsableColor → responsable.finca_id` (no `producto.fincaId`)
- [ ] 2B.4 `ventas.service.ts`: scoping por responsable/finca (no `producto.fincaId`)
- [ ] 2B.5 `semana-reconciliation.service.ts` y `registros.service.ts`: pasar `responsableId` a `recalcular`; caja desde producto
- [ ] 2B.6 `semanas.service.ts`: quitar `producto.finca` del filtro/relations de activos; caja desde producto

## Fase 3 — Carga masiva
- [ ] 3.1 `admin.service.ts`: upsert producto por `codigo` global; set `longitud`/`caja`; color sin caja
- [ ] 3.2 CSV nuevo: columnas `CODIGO, PRODUCTO, LONGITUD, CAJA, VARIEDAD, COLOR, FINCA, RESPONSABLE`
- [ ] 3.3 `BulkUploadCatalog.tsx`: actualizar plantilla y textos

## Fase 4 — Vinculación granular (F4)
- [ ] 4.1 DTO `AssignProductosResponsable` con `{ productoIds?, variedadIds?, colorIds? }`
- [ ] 4.2 `fincas.service.ts`: expandir selección mixta a `color_id` activos + `reconcileResponsable`
- [ ] 4.3 Endpoint en `fincas.controller.ts`

## Fase 5 — Frontend catálogo global
- [ ] 5.1 `admin/catalogo/page.tsx`: quitar selector de finca
- [ ] 5.2 Grilla con columnas `código, producto, longitud, caja (editable), variedad, color`
- [ ] 5.3 Caja editable a nivel producto

## Fase 6 — Frontend asignación granular
- [ ] 6.1 `admin/fincas/[id]/page.tsx`: árbol producto/variedad/color con checkboxes parciales
- [ ] 6.2 Conectar al nuevo endpoint de vinculación

## Fase 7 — Verificación end-to-end
- [ ] 7.1 Reset BD + re-import CSV nuevo
- [ ] 7.2 Validar consolidado diario/semanal con caja a nivel producto
- [ ] 7.3 Validar asignación parcial (variedad/color) y reconciliación de semanas
