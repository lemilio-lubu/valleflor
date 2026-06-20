---
type: escenario
hu: "[[F4 Vinculación de Productos]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Asignación productiva

```gherkin
Caso: Asignación de producto
Dado que existe una Finca
Y existe un responsable asignado a la finca
Y existe un producto catalogado
Cuando el administrador asigna un producto a un responsable
Entonces el producto queda asociado al responsable asignado

Caso: Asignación de variedad
Dado que existe una Finca
Y existe un responsable asignado a la finca
Y existen variedades catalogadas
Cuando el administrador asigna las variedades a un responsable
Entonces las variedades quedan asociadas al responsable asignado

Caso: Asignación de color
Dado que existe una Finca
Y existe un responsable asignado a la finca
Y existen colores catalogados
Cuando el administrador asigna los colores a un responsable
Entonces los colores quedan asociados al responsable asignado
```

Conceptos: [[Asignación productiva]] · [[Finca]] · [[Responsable]] · [[Producto]] · [[Variedad]] · [[Color]]
