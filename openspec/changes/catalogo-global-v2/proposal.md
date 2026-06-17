# Propuesta — Catálogo global V2 + vinculación granular

## Intención

Migrar el catálogo de productos de un modelo **por finca** (que duplica productos) a un
**catálogo único y global** para toda la operación, con atributos a nivel de producto, y
habilitar la **vinculación granular** (producto / variedad / color) de F4.

Cubre las capacidades **F3 (Catalogación de Productos)** y **F4 (Vinculación de Productos)**.
F1 (Definición de Fincas) y F2 (Definición de Responsabilidades) ya existen y quedan fuera de alcance.

## Problema

- `Producto.finca_id` ([apps/api/src/productos/producto.entity.ts](../../../apps/api/src/productos/producto.entity.ts))
  hace que el mismo producto se cree una vez por finca. Unicidad por `nombre + finca_id`
  ([apps/api/src/productos/productos.service.ts:67](../../../apps/api/src/productos/productos.service.ts)).
  No existe catálogo único → contradice F3.
- El producto carece de `codigo` (F3 exige código, nombre, variedad y clasificación por color).
- La vinculación a responsables solo admite producto entero
  ([apps/api/src/fincas/fincas.service.ts:162](../../../apps/api/src/fincas/fincas.service.ts)),
  no variedad ni color sueltos → contradice F4.

## Decisiones (validadas con el stakeholder)

1. **Catálogo global**: Producto/Variedad/Color dejan de pertenecer a una finca.
2. **Regenerar desde cero**: sin migración de datos; reset de catálogo + registros + semanas y
   re-import vía carga masiva. Sin remapeo de `color_id`.
3. **Atributos a nivel Producto**: `codigo`, `longitud`, `tallos_por_caja`.
4. **Variedad y Color** conservan solo `nombre` (+ `activo`). Se elimina `codigo`/`nombre_original`
   de Color y cualquier código de Variedad.
5. **Jerarquía de 3 niveles** Producto → Variedad → Color. Color sigue siendo entidad para
   permitir asignación granular (F4) y porque los registros apuntan a `color_id`.

## Impacto

- **Esquema**: Producto, Variedad, Color, Finca, carga masiva (CSV).
- **Cálculos**: `tallos_por_caja` se consume en 15 archivos; pasa a leerse navegando
  `color → variedad → producto`. Consecuencia funcional aceptada: todos los colores de un
  producto comparten caja.
- **Frontend**: catálogo deja de filtrar por finca; asignación pasa a árbol seleccionable.

## Fuera de alcance

- F1/F2 (fincas y responsables) — ya implementados.
- Migración/preservación de datos productivos existentes.
