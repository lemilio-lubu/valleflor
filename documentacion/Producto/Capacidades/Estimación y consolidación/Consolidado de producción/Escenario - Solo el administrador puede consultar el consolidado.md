---
type: escenario
hu: "[[Consolidado de producción]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Solo el administrador puede consultar el consolidado

```gherkin
Dado un usuario con rol de responsable
Cuando intenta consultar el consolidado
Entonces el sistema niega el acceso
```

Conceptos: [[Consolidado]] · [[Responsable]] · [[Administrador]]
