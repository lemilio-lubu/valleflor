# language: es
Característica: Gestión de semanas de estimación
  Como responsable de una finca
  Quiero crear semanas de trabajo
  Para registrar la producción diaria de los colores que tengo asignados

  Antecedentes:
    Dado que la finca "Norte" está registrada
    Y que Ana es responsable operativa
    Y Ana es responsable de "Norte"
    Y que el catálogo contiene el ítem "Freedom Cherry" con código "8001", del producto "Freedom", variedad "Red" y color "Cherry"
    Y Ana tiene asignado el color del ítem
    Y que Ana ha iniciado sesión

  Escenario: Crear una semana genera la plantilla diaria de los colores asignados
    Cuando Ana crea la semana 30 de 2026
    Entonces la semana 30 de 2026 queda disponible con 7 registros diarios

  Escenario: No se puede duplicar una semana del mismo responsable
    Dado que Ana ha creado la semana 30 de 2026
    Cuando Ana crea la semana 30 de 2026
    Entonces el sistema rechaza la semana por estar duplicada

  Escenario: Solo un responsable de finca puede crear semanas
    Cuando el administrador intenta crear la semana 30 de 2026
    Entonces el sistema niega la creación de la semana

  Escenario: Un responsable elimina su propia semana
    Dado que Ana ha creado la semana 30 de 2026
    Cuando Ana elimina la semana
    Entonces la semana 30 de 2026 ya no está disponible

  Escenario: Las semanas del responsable se listan paginadas
    Dado que Ana ha creado la semana 30 de 2026
    Y que Ana ha creado la semana 31 de 2026
    Y que Ana ha creado la semana 32 de 2026
    Cuando Ana lista sus semanas con página 1 y límite 2
    Entonces la lista reporta 3 semanas en total y 2 en la página
