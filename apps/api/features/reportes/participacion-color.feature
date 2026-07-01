# language: es
Característica: Participación por color en la producción semanal
  Como administrador
  Quiero ver el porcentaje de participación de cada color dentro del total
  de cajas reales de su producto por semana
  Para analizar la distribución de la producción por color

  # Base de prueba: producto "Freedom" con dos colores — Cherry (60 cajas) y
  # White (40 cajas) — en la semana 30 de 2026. Participación esperada: 60 % y 40 %.

  Antecedentes:
    Dado que la base de participación por color está sembrada con Cherry 60 cajas y White 40 cajas en la semana 30 de 2026

  Escenario: El administrador consulta la participación con rango válido
    Cuando el administrador consulta la participación por color de la semana 30 de 2026
    Entonces la respuesta de participación es un arreglo con al menos 2 filas
    Y las filas tienen la forma de ParticipacionColorRow

  Escenario: La suma de participaciones de un producto en una semana es 100 %
    Cuando el administrador consulta la participación por color de la semana 30 de 2026
    Entonces la suma de participaciones del producto "Freedom" en la semana 30 es 100 con tolerancia 0.1

  Escenario: Un color con 0 cajas reales tiene participación nula
    Cuando el administrador consulta la participación por color de la semana 30 de 2026
    Entonces un color con cajasReales 0 en la misma semana tiene participación nula

  Escenario: Un color sin ningún registro devuelve el centinela de semana cero
    Cuando el administrador consulta la participación por color sin filtros
    Entonces existe al menos una fila con numeroSemana 0 y participación nula

  Escenario: Un responsable no puede consultar la participación por color
    Cuando un responsable consulta la participación por color de la semana 30 de 2026
    Entonces el sistema niega el acceso a la participación por color

  @ui
  Escenario: La participación se muestra con formato de porcentaje
    Entonces la participación 60.5 se formatea como "60.5%"

  @ui
  Escenario: La participación nula se muestra como guión largo
    Entonces la participación nula se formatea como "—"
