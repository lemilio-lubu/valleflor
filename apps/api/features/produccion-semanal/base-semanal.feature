# language: es
Característica: Consolidación semanal y estimaciones
  Como responsable de una finca
  Quiero ver la producción real y estimada de cada color por semana
  Para planificar y comparar lo estimado contra lo real

  # Tallos por caja del producto "Freedom" = 400.

  Antecedentes:
    Dado que la finca "Norte" está registrada
    Y que Ana es responsable operativa
    Y Ana es responsable de "Norte"
    Y que el catálogo contiene el ítem "Freedom Cherry" con código "8001", del producto "Freedom", variedad "Red" y color "Cherry"
    Y Ana tiene asignado el color del ítem
    Y que Ana ha iniciado sesión
    Y que Ana ha creado la semana actual

  Escenario: La base semanal suma la producción real de la semana
    Dado que Ana ha registrado 10 cajas el lunes
    Y que Ana ha registrado 20 cajas el martes
    Cuando Ana consulta la base semanal de la semana actual
    Entonces la base semanal del color refleja 30 cajas reales y 12000 tallos reales

  Escenario: Un responsable registra una estimación de la semana
    Dado que Ana ha estimado 50 cajas con divisor 400 para el color en la semana actual
    Cuando Ana consulta la base semanal de la semana actual
    Entonces la base semanal del color refleja 50 cajas estimadas y 20000 tallos estimados

  Escenario: Un responsable no ve los colores de otra finca
    Dado que Ana ha registrado 10 cajas el lunes
    Y que la finca "Sur" está registrada
    Y que Beto es responsable operativa
    Y Beto es responsable de "Sur"
    Y que Beto ha iniciado sesión
    Cuando Beto consulta la base semanal de la semana actual
    Entonces la base semanal no incluye el color de Ana

  Escenario: El administrador limpia las estimaciones de una semana
    Dado que Ana ha estimado 50 cajas con divisor 400 para el color en la semana actual
    Cuando el administrador limpia las estimaciones de la finca de Ana en la semana actual
    Y Ana consulta la base semanal de la semana actual
    Entonces la base semanal del color refleja 0 cajas estimadas y 0 tallos estimados

  Escenario: Al borrar una semana, el valor real se conserva como estimación
    Dado que Ana ha registrado 10 cajas el lunes
    Cuando Ana elimina la semana
    Y Ana consulta la base semanal de la semana actual
    Entonces la base semanal del color conserva 10 cajas estimadas y 0 reales

  # El reloj de las pruebas está fijado en la semana ISO 25 de 2026, así que la
  # semana 40 es futura.
  Escenario: Una semana futura sin producción no se marca como real
    Dado que Ana ha creado la semana 40 de 2026
    Y que Ana ha registrado 0 cajas el lunes
    Cuando Ana consulta la matriz desde la semana 40 de 2026 por 1 semanas
    Entonces la semana 40 del color no es real

  Escenario: Una semana futura con producción se marca como real
    Dado que Ana ha creado la semana 40 de 2026
    Y que Ana ha registrado 10 cajas el lunes
    Cuando Ana consulta la matriz desde la semana 40 de 2026 por 1 semanas
    Entonces la semana 40 del color es real
