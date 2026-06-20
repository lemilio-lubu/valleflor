# language: es
Característica: Vinculación de productos
  Como administrador
  Quiero asociar ítems del catálogo a las fincas y responsables correspondientes
  Para definir correctamente las asignaciones dentro de la operación

  Antecedentes:
    Dado que la finca "Norte" está registrada
    Y que Ana es responsable operativa
    Y Ana es responsable de "Norte"
    Y que el catálogo contiene el ítem "Freedom Cherry" con código "8001", del producto "Freedom", variedad "Red" y color "Cherry"

  Esquema del escenario: Asignar un ítem del catálogo a un responsable
    Cuando el administrador asigna a Ana el ítem por <nivel>
    Entonces Ana tiene asignado el ítem en "Norte"

    Ejemplos:
      | nivel    |
      | producto |
      | variedad |
      | color    |

  Escenario: No se asigna un ítem a un responsable inexistente
    Cuando el administrador asigna el ítem a un responsable inexistente de "Norte"
    Entonces el sistema no registra la asignación
