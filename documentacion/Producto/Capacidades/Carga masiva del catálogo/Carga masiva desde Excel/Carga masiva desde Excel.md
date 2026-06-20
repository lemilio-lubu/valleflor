---
type: hu
capacidad: "[[Carga masiva del catálogo]]"
feature: Carga masiva
estado: aprobada
tags: [hu]
---

# Carga masiva desde Excel

**Descripción:** carga del catálogo y las [[Asignación productiva|asignaciones]] a partir de un archivo Excel, validando cada fila e informando un resumen (insertados, omitidos, errores).

> Como [[Administrador]]
> quiero cargar el catálogo y sus asignaciones desde un Excel
> para configurar la operación de forma masiva sin capturar registro por registro.

## Escenarios
- [[Escenario - Carga masiva válida crea catálogo y asigna color]]
- [[Escenario - Filas inválidas se reportan sin abortar el resto]]
- [[Escenario - Asignación duplicada se omite]]
- [[Escenario - La previsualización no persiste cambios]]
- [[Escenario - Solo el administrador puede ejecutar la carga masiva]]
