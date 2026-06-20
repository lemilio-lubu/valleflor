---
type: escenario
hu: "[[Carga masiva desde Excel]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Solo el administrador puede ejecutar la carga masiva

```gherkin
Dado un usuario con rol de responsable
Cuando intenta ejecutar una carga masiva
Entonces el sistema niega el acceso
```

Conceptos: [[Carga masiva]] · [[Responsable]] · [[Administrador]]
