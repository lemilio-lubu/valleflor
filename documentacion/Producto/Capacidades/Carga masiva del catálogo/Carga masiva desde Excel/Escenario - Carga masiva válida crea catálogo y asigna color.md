---
type: escenario
hu: "[[Carga masiva desde Excel]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Carga masiva válida crea catálogo y asigna color

```gherkin
Dado un archivo con una fila válida (finca y responsable existentes)
Cuando el administrador realiza la carga masiva
Entonces el producto, variedad y color quedan registrados en el catálogo
Y el color queda asignado al responsable
Y el resumen reporta los registros insertados
```

Conceptos: [[Carga masiva]] · [[Ítem de catálogo]] · [[Asignación productiva]] · [[Administrador]]
