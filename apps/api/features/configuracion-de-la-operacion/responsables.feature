# language: es
Característica: Definición de responsabilidades
  Como administrador
  Quiero asignar responsables a cada finca
  Para establecer claramente las responsabilidades dentro de la operación

  Antecedentes:
    Dado que la finca "Norte" está registrada

  Escenario: Asignar la responsabilidad operativa de una finca
    Dado que Ana es responsable operativa
    Cuando el administrador asigna a Ana como responsable de "Norte"
    Entonces Ana queda asociada a "Norte"

  Escenario: Transferir la responsabilidad operativa a otra finca
    Dado que la finca "Sur" está registrada
    Y que Ana es responsable operativa
    Y Ana es responsable de "Norte"
    Cuando el administrador transfiere la responsabilidad de Ana a "Sur"
    Entonces Ana queda asociada a "Sur"
    Y Ana deja de estar asociada a "Norte"

  Escenario: Solo un responsable operativo puede quedar a cargo de una finca
    Dado que Beto no es responsable operativo
    Cuando el administrador asigna a Beto como responsable de "Norte"
    Entonces el sistema rechaza la asignación de Beto
