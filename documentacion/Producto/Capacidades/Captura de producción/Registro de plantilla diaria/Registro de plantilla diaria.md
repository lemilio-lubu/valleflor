---
type: hu
capacidad: "[[Captura de producción]]"
feature: Plantilla diaria
estado: aprobada
tags: [hu]
---

# Registro de plantilla diaria

**Descripción:** captura diaria de [[Caja]]s por [[Color]] en la [[Plantilla diaria]]. El sistema calcula los [[Tallo]]s (cajas × [[Tallos por caja]]), redondea, advierte valores atípicos y permite ajustar el divisor por registro.

> Como [[Responsable]]
> quiero registrar las cajas producidas cada día
> para que el sistema calcule los tallos y consolide la producción.

## Escenarios
- [[Escenario - Registrar cajas calcula los tallos]]
- [[Escenario - Las cajas se redondean a dos decimales]]
- [[Escenario - Un valor inusualmente alto genera una advertencia]]
- [[Escenario - Cambiar el divisor recalcula los tallos]]
- [[Escenario - La plantilla refleja el divisor ajustado por registro]]
- [[Escenario - Actualización en lote de varios registros]]
- [[Escenario - Recalcular todos los registros]]
- [[Escenario - Cambiar los tallos por caja del producto]]
- [[Escenario - Datos inválidos son rechazados]]
