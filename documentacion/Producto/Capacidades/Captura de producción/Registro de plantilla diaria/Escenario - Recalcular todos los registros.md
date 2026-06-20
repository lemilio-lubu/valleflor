---
type: escenario
hu: "[[Registro de plantilla diaria]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Recalcular todos los registros

```gherkin
Dado registros con cajas capturadas
Cuando el administrador recalcula todos los registros
Entonces cada registro reaplica su divisor almacenado sobre sus cajas
Y se informa cuántos registros se actualizaron
```

> Nota: el recálculo masivo reaplica el divisor de cada registro, no el [[Tallos por caja]] vigente del [[Producto]].

Conceptos: [[Plantilla diaria]] · [[Tallo]] · [[Tallos por caja]] · [[Administrador]]
