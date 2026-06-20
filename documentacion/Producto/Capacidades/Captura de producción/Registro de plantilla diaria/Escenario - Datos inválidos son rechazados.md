---
type: escenario
hu: "[[Registro de plantilla diaria]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Datos inválidos son rechazados

```gherkin
Dado un registro diario
Cuando el responsable intenta registrar cajas negativas
O intenta fijar un divisor menor que uno
Entonces el sistema rechaza la operación por datos inválidos
```

Conceptos: [[Plantilla diaria]] · [[Caja]] · [[Tallos por caja]]
