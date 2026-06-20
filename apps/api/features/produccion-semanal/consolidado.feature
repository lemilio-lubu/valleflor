# language: es
Característica: Consolidado de producción
  Como administrador
  Quiero ver el consolidado diario y semanal de todas las fincas
  Para tener la foto global de la producción real y estimada

  # Tallos por caja del producto "Freedom" = 400.

  Antecedentes:
    Dado que la finca "Norte" está registrada
    Y que Ana es responsable operativa
    Y Ana es responsable de "Norte"
    Y que el catálogo contiene el ítem "Freedom Cherry" con código "8001", del producto "Freedom", variedad "Red" y color "Cherry"
    Y Ana tiene asignado el color del ítem
    Y que Ana ha iniciado sesión
    Y que Ana ha creado la semana 30 de 2026

  Escenario: El consolidado diario suma la plantilla de la semana
    Dado que Ana ha registrado 10 cajas el lunes
    Cuando el administrador consulta el consolidado diario de la semana 30 de 2026
    Entonces el consolidado diario del código "8001" suma 10 cajas y 4000 tallos

  Escenario: El consolidado semanal muestra producción real y estimada
    Dado que Ana ha registrado 10 cajas el lunes
    Y que Ana ha estimado 50 cajas con divisor 400 para el color en la semana 30 de 2026
    Cuando el administrador consulta el consolidado semanal de la semana 30 de 2026
    Entonces el consolidado semanal del código "8001" muestra 10 cajas reales y 50 cajas estimadas

  Escenario: El consolidado diario suma la producción de todas las fincas
    Dado que la finca "Sur" está registrada
    Y que Beto es responsable operativa
    Y Beto es responsable de "Sur"
    Y Beto tiene asignado el color del ítem
    Y que Beto ha iniciado sesión
    Y que Beto ha creado la semana 30 de 2026
    Y que Ana ha registrado 10 cajas el lunes
    Y que Beto ha registrado 15 cajas el lunes
    Cuando el administrador consulta el consolidado diario de la semana 30 de 2026
    Entonces el consolidado diario del código "8001" suma 25 cajas y 10000 tallos

  Escenario: Un responsable no puede consultar el consolidado
    Cuando Ana consulta el consolidado diario de la semana 30 de 2026
    Entonces el sistema niega el acceso al consolidado
