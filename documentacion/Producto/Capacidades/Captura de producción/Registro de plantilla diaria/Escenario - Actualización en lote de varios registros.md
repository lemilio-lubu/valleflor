---
type: escenario
hu: "[[Registro de plantilla diaria]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Actualización en lote de varios registros

```gherkin
Dado varios registros diarios de la semana
Cuando el responsable actualiza sus cajas en una sola operación
Entonces cada registro recalcula sus tallos
Y se devuelve un resultado por cada registro actualizado
```

Conceptos: [[Plantilla diaria]] · [[Caja]] · [[Tallo]]
