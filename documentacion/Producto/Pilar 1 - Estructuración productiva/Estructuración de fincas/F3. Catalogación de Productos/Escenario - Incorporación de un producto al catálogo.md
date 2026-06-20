---
type: escenario
hu: "[[F3 Catalogación de Productos]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Incorporación de una definición productiva al catálogo

```gherkin
Dado que una definición productiva será utilizada dentro de la operación
Y la organización requiere mantener definiciones productivas estandarizadas
Cuando el administrador incorpora la definición productiva compuesta por <producto>, <variedad>, <color>, <codigo> y <nombre>
Entonces la definición productiva pasa a formar parte del catálogo oficial
Y queda identificada por el código <codigo>
```

Ejemplos:

| producto  | variedad | color | codigo | nombre            |
| --------- | -------- | ----- | ------ | ----------------- |
| Bellandes | Dark     | Dark  | 6554   | Nelandes Astassus |
| Bellandes | White    | White | 6898   | Nelabandes White  |

Conceptos: [[Definición productiva]] · [[Producto]] · [[Variedad]] · [[Color]] · [[Código de producto]] · [[Nombre comercial]]

Pendientes asociados (ver Backlog): eliminación del parámetro de longitud, suma total por [[Semana]] por definición productiva, y ejemplificación del [[Porcentaje de participación]].
