---
type: escenario
hu: "[[Registro de plantilla diaria]]"
estado: aprobada
tags: [escenario]
---

# Escenario — Un valor inusualmente alto genera una advertencia

```gherkin
Dado un color con un promedio reciente de cajas
Cuando el responsable registra un valor mucho mayor que ese promedio
Entonces el sistema acepta el registro
Y devuelve una advertencia de posible error de tipeo
```

Conceptos: [[Plantilla diaria]] · [[Caja]]
