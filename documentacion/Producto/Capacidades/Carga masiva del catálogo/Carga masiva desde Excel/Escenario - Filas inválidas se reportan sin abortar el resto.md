---
type: escenario
hu: "[[Carga masiva desde Excel]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Filas inválidas se reportan sin abortar el resto

```gherkin
Dado un archivo con una fila válida y una fila con una finca inexistente
Cuando el administrador realiza la carga masiva
Entonces la fila válida se procesa e inserta sus registros
Y la fila inválida se reporta como error
Y la carga no se interrumpe por la fila inválida
```

Conceptos: [[Carga masiva]] · [[Finca]] · [[Administrador]]
