---
type: escenario
hu: "[[Gestión de semanas]]"
estado: aprobada
tags: [escenario]
---

# Escenario — No se duplica una semana del responsable

```gherkin
Dado un responsable que ya creó una semana
Cuando intenta crear la misma semana otra vez
Entonces el sistema rechaza la semana por estar duplicada
```

Conceptos: [[Semana]] · [[Responsable]]
