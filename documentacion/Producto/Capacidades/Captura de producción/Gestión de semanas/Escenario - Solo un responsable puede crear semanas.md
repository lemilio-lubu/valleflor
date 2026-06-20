---
type: escenario
hu: "[[Gestión de semanas]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Solo un responsable puede crear semanas

```gherkin
Dado un usuario que no es responsable de ninguna finca
Cuando intenta crear una semana
Entonces el sistema niega la creación de la semana
```

Conceptos: [[Semana]] · [[Responsable]] · [[Administrador]]
