---
type: escenario
hu: "[[F3 Catalogación de Productos]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Incorporación de un ítem al catálogo

```gherkin
Dado que un ítem de catálogo será utilizado dentro de la operación
Y la organización requiere mantener ítems de catálogo estandarizados
Cuando el administrador incorpora el ítem de catálogo compuesto por <producto>, <variedad>, <color>, <codigo> y <nombre>
Entonces el ítem pasa a formar parte del catálogo
Y queda identificado por el código <codigo>
```

Ejemplos:

| producto  | variedad | color | codigo | nombre            |
| --------- | -------- | ----- | ------ | ----------------- |
| Bellandes | Dark     | Dark  | 6554   | Nelandes Astassus |
| Bellandes | White    | White | 6898   | Nelabandes White  |

Conceptos: [[Ítem de catálogo]] · [[Producto]] · [[Variedad]] · [[Color]] · [[Código de producto]] · [[Nombre comercial]]

Pendientes asociados (ver Backlog): eliminación del parámetro de longitud, suma total por [[Semana]] por ítem de catálogo, y ejemplificación del [[Porcentaje de participación]].
