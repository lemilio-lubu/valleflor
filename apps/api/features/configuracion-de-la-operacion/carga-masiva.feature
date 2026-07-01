# language: es
Característica: Carga masiva del catálogo
  Como administrador
  Quiero cargar el catálogo y las asignaciones desde un Excel
  Para configurar la operación de forma masiva

  # La carga llega con la finca en mayúsculas ("NORTE") y el alta la guardó en
  # mixed-case ("Norte"): la resolución de finca debe ser case-insensitive.
  Antecedentes:
    Dado que la finca "Norte" está registrada
    Y que Ana es responsable operativa
    Y Ana es responsable de "Norte"

  Escenario: Una carga válida crea el catálogo y asigna el color
    Cuando el administrador realiza una carga masiva con:
      | FINCA | RESPONSABLE | CODIGO | PRODUCTO | VARIEDAD | COLOR |
      | NORTE | ANA         | 9001   | Rosa     | Freedom  | Rojo  |
    Entonces la carga reporta 4 insertados y 0 errores

  Escenario: Las filas inválidas se reportan sin abortar el resto
    Cuando el administrador realiza una carga masiva con:
      | FINCA       | RESPONSABLE | CODIGO | PRODUCTO | VARIEDAD | COLOR  |
      | NORTE       | ANA         | 9001   | Rosa     | Freedom  | Rojo   |
      | Inexistente | ANA         | 9002   | Clavel   | Standard | Blanco |
    Entonces la carga reporta 4 insertados y 1 errores

  Escenario: Una asignación duplicada se omite
    Cuando el administrador realiza una carga masiva con:
      | FINCA | RESPONSABLE | CODIGO | PRODUCTO | VARIEDAD | COLOR |
      | NORTE | ANA         | 9001   | Rosa     | Freedom  | Rojo  |
      | NORTE | ANA         | 9001   | Rosa     | Freedom  | Rojo  |
    Entonces la carga reporta 1 omitidos

  Escenario: Una carga sin FINCA ni RESPONSABLE arma el catálogo sin asignar nada
    Cuando el administrador realiza una carga masiva con:
      | CODIGO | PRODUCTO | VARIEDAD | COLOR |
      | 9003   | Clavel   | Standard | Rosa  |
    Entonces la carga reporta 3 insertados y 0 errores

  Escenario: Una carga con FINCA sin RESPONSABLE arma el catálogo y avisa que no asignó
    Cuando el administrador realiza una carga masiva con:
      | FINCA | CODIGO | PRODUCTO | VARIEDAD | COLOR    |
      | NORTE | 9004   | Clavel   | Standard | Amarillo |
    Entonces la carga reporta 3 insertados y 1 errores

  Escenario: La previsualización no persiste cambios
    Cuando el administrador previsualiza una carga masiva con:
      | FINCA | RESPONSABLE | CODIGO | PRODUCTO | VARIEDAD | COLOR |
      | NORTE | ANA         | 9001   | Rosa     | Freedom  | Rojo  |
    Entonces el catálogo de productos sigue vacío

  Escenario: Un responsable no puede ejecutar una carga masiva
    Dado que Ana ha iniciado sesión
    Cuando Ana intenta una carga masiva
    Entonces el sistema niega el acceso a la carga masiva
