---
type: escenario
hu: "[[Gestión de semanas]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Las semanas se listan paginadas

```gherkin
Dado un responsable con tres semanas creadas
Cuando consulta la primera página con un límite de dos
Entonces obtiene dos semanas en la página
Y el total reportado es tres
```

Conceptos: [[Semana]] · [[Responsable]]
