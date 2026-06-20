---
type: escenario
hu: "[[Estimación semanal]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Al borrar la semana el real se conserva como estimación

```gherkin
Dado un color con producción real registrada y sin estimación previa
Cuando el responsable elimina la semana
Entonces el valor real se conserva como estimación
Y la producción real del color queda en cero
```

Conceptos: [[Semana]] · [[Estimado semanal]] · [[Caja]]
