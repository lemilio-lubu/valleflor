# language: es
Característica: Definición de fincas
  Como administrador
  Quiero registrar las fincas que forman parte de la operación
  Para organizar de manera consistente la información

  Escenario: Una finca nueva queda registrada
    Cuando el administrador registra la finca "La Esperanza"
    Entonces la finca "La Esperanza" queda registrada

  Escenario: Una finca ya registrada no se duplica
    Dado que la finca "La Esperanza" está registrada
    Cuando el administrador intenta registrar nuevamente la finca "La Esperanza"
    Entonces el sistema no duplica la finca "La Esperanza"
