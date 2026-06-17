# Diseño técnico — Catálogo global V2

## Modelo de datos

```
ANTES                                  DESPUÉS
Finca ──< Producto(finca_id)           Producto (GLOBAL)
            ├ nombre                      ├ codigo            (NUEVO, único)
            └ activo                      ├ nombre            (único global)
         ──< Variedad                     ├ longitud          (NUEVO)
            └ nombre                      ├ tallos_por_caja   (MOVIDO desde Color)
         ──< Color                        ├ activo / motivo_baja
            ├ nombre                   ──< Variedad (producto_id)
            ├ tallos_por_caja             └ nombre / activo
            ├ codigo                   ──< Color (variedad_id)
            └ nombre_original             └ nombre / activo   (sin caja, sin codigo)
```

### Cambios por entidad

- **Producto** (`apps/api/src/productos/producto.entity.ts`)
  - Quitar `finca_id` + relación `finca` + `@OneToMany` inverso en Finca.
  - Agregar `codigo: string` (varchar, `@Unique`), `longitud: number` (int, cm, nullable),
    `tallos_por_caja: number` (int, default 400, name `tallos_por_caja`).
  - Conservar `nombre` (ahora único global), `activo`, `motivo_baja` (de V1).
- **Variedad**: unicidad `nombre + producto_id`. Sin columnas nuevas.
- **Color** (`apps/api/src/colores/color.entity.ts`): eliminar `tallos_por_caja`, `codigo`,
  `nombre_original`. Queda `nombre` + `activo`. Unicidad `nombre + variedad_id`.
- **Finca**: quitar relación `productos`.
- **ResponsableColor**: sin cambios de esquema (hoja = color).

### Decisión de tipo — `longitud`
`int` (cm) por defecto. Si se manejan rangos ("50/60") cambiar a `varchar`. Recomendado: `int`.

## Cálculo de tallos

Punto de mayor superficie: `tallos_por_caja` se usa en 15 archivos. Pasa de `color.tallosPorCaja`
a `color.variedad.producto.tallosPorCaja`. Archivos núcleo:
- `apps/api/src/consolidado/consolidado.service.ts`
- `apps/api/src/base-semanal/base-semanal.service.ts`
- `apps/api/src/base-semanal/semana-reconciliation.service.ts`
- `apps/api/src/semanas/semanas.service.ts`
- `apps/api/src/registros/registros.service.ts`
- DTOs de color que exponían `tallosPorCaja` → mover a DTOs de producto.

Estrategia: las queries que hoy cargan `color` agregan `relations`/joins a
`variedad` y `producto` para leer la caja, o se denormaliza el valor en el cálculo.

## Carga masiva (CSV)

Columnas nuevas: `CODIGO, PRODUCTO, LONGITUD, CAJA, VARIEDAD, COLOR, FINCA, RESPONSABLE`.
`apps/api/src/admin/admin.service.ts`:
- Producto: upsert por `codigo` (global), set `longitud` y `tallos_por_caja`.
- Variedad: por `nombre + producto`. Color: por `nombre + variedad` (sin caja).
- Asignación: responsable por `finca + nombre` → `ResponsableColor`.
- Plantilla CSV en `apps/web/.../BulkUploadCatalog.tsx` actualizada.

## Vinculación granular (F4)

Almacenamiento sin cambios (color-level). Nuevo DTO de asignación que acepte selección mixta:
`{ productoIds?, variedadIds?, colorIds? }` y la expanda a los `color_id` finales (solo activos)
antes de persistir y llamar `reconcileResponsable`. Reemplaza a `setProductosResponsable`.

## Frontend

- `apps/web/src/app/admin/catalogo/page.tsx`: quitar selector de finca; grilla global con
  columnas `código, producto, longitud, caja (editable), variedad, color`.
- `apps/web/src/app/admin/fincas/[id]/page.tsx`: árbol producto/variedad/color con checkboxes
  parciales para la asignación.

## Reset de datos

`apps/api/src/database/database-bootstrap.service.ts`: agregar columnas a producto, dropear de
color. Como se regenera desde cero, se acepta reset limpio de catálogo + registros + semanas +
`responsable_colores`. Re-import por carga masiva con el CSV nuevo.

## Riesgos

1. Cálculos de tallos (15 archivos) — verificar consolidado end-to-end.
2. Bootstrap no idempotente al dropear columnas de Color — manejar o aceptar reset de BD.
3. Tamaño del cambio: probable > 400 líneas → evaluar PRs encadenados (`ask-on-risk`).
