---
type: escenario
hu: "[[Carga masiva desde Excel]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Asignación duplicada se omite

```gherkin
Dado un archivo con dos filas idénticas (mismo responsable y mismo color)
Cuando el administrador realiza la carga masiva
Entonces la asignación se crea una sola vez
Y la repetición se reporta como omitida
```

Conceptos: [[Carga masiva]] · [[Asignación productiva]] · [[Color]]
