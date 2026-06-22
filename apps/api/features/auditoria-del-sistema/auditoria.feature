# language: es
Característica: Auditoría de cambios en los datos maestros
  Como administrador
  Quiero consultar el historial de cambios y los accesos sobre fincas, usuarios y catálogo
  Para saber quién modificó cada dato y cuándo, y poder rendir cuentas

  Esquema del escenario: Cada cambio sobre los datos maestros queda registrado en la auditoría
    Dado que la administradora "Ana" gestiona el módulo de <módulo>
    Cuando realiza la acción "<acción>" sobre un elemento del módulo de <módulo>
    Entonces la auditoría registra un movimiento con la responsable "Ana", la acción "<acción>", el módulo de <módulo> y la fecha y hora del cambio

    Ejemplos:
      | módulo   | acción   |
      | fincas   | Creación |
      | fincas   | Edición  |
      | fincas   | Baja     |
      | fincas   | Alta     |
      | usuarios | Creación |
      | usuarios | Edición  |
      | usuarios | Baja     |
      | catálogo | Creación |
      | catálogo | Edición  |
      | catálogo | Baja     |
      | catálogo | Alta     |

  Escenario: Una edición guarda el valor anterior del dato modificado
    Dado que la administradora "Ana" gestiona el módulo de fincas
    Y la finca "La Esperanza" está registrada
    Cuando "Ana" edita la finca y cambia su nombre a "La Esperanza Alta"
    Entonces la auditoría registra un movimiento de Edición con el valor anterior "La Esperanza" y el valor nuevo "La Esperanza Alta"

  Escenario: Una edición de usuario registra un movimiento por cada campo modificado
    Dado que la administradora "Ana" gestiona el módulo de usuarios
    Y existe un usuario para editar con nombre "Carlos" y rol responsable
    Cuando "Ana" edita ese usuario y cambia su nombre, su rol y su contraseña
    Entonces la auditoría registra un movimiento de Edición de usuarios para el campo "Nombre"
    Y la auditoría registra un movimiento de Edición de usuarios para el campo "Rol"
    Y la auditoría registra un movimiento de Edición de usuarios para el campo "Contraseña"
    Y ningún movimiento de auditoría expone la contraseña

  Escenario: La asignación de un responsable a una finca queda registrada en la auditoría
    Dado que la administradora "Ana" gestiona el módulo de fincas
    Cuando asigna un responsable a una finca
    Entonces la auditoría registra un movimiento con la responsable "Ana", la acción "Asignación de responsable", el módulo de fincas y la fecha y hora

  Escenario: Una carga masiva queda registrada en la auditoría
    Dado que la administradora "Ana" gestiona el módulo de catálogo
    Cuando realiza una carga masiva en el catálogo
    Entonces la auditoría registra un movimiento con la responsable "Ana", la acción "Carga masiva", el módulo de catálogo y la fecha y hora

  Escenario: Cada inicio de sesión queda registrado en la auditoría
    Cuando un administrador inicia sesión en el portal de administración
    Entonces la auditoría registra el acceso con el administrador y la fecha y hora del inicio de sesión

  Escenario: Los inicios de sesión se consultan en un apartado propio, separado de los cambios
    Dado que el administrador inició sesión en el portal de administración
    Y existen accesos al sistema y cambios en los módulos registrados
    Cuando consulta la auditoría
    Entonces los inicios de sesión se muestran en el apartado de "Accesos al sistema"
    Y no aparecen mezclados con el historial de cambios de fincas, usuarios ni catálogo

  Esquema del escenario: El administrador consulta el historial de cambios de un módulo
    Dado que el administrador inició sesión en el portal de administración
    Y existen movimientos de auditoría registrados en el módulo de <módulo>
    Cuando consulta la auditoría del módulo de <módulo>
    Entonces ve los movimientos registrados de <módulo> con su responsable, acción y fecha
    Y los movimientos se muestran del más reciente al más antiguo

    Ejemplos:
      | módulo   |
      | fincas   |
      | usuarios |
      | catálogo |

  Escenario: El historial avisa cuando un módulo no tiene cambios registrados
    Dado que el administrador inició sesión en el portal de administración
    Y el módulo de usuarios no tiene movimientos de auditoría registrados
    Cuando consulta la auditoría del módulo de usuarios
    Entonces el sistema indica que no hay movimientos registrados para ese módulo
    # ── Filtrado del historial ─────────────────────────────────────────────────

  Esquema del escenario: El administrador filtra el historial por responsable o por tipo de acción
    Dado que el administrador inició sesión en el portal de administración
    Y el módulo de fincas tiene movimientos de varios responsables y tipos de acción
    Cuando filtra la auditoría del módulo de fincas por <criterio>
    Entonces solo ve los movimientos que coinciden con <criterio>

    Ejemplos:
      | criterio                    |
      | la responsable "Ana"        |
      | el tipo de acción "Edición" |

  Escenario: El filtro no devuelve movimientos cuando ninguno coincide
    Dado que el administrador inició sesión en el portal de administración
    Y el módulo de fincas tiene movimientos solo de la responsable "Ana"
    Cuando filtra la auditoría del módulo de fincas por la responsable "Beatriz"
    Entonces el sistema indica que no hay movimientos que coincidan con el filtro

  Escenario: El administrador oculta los filtros de la auditoría
    Dado que el administrador inició sesión en el portal de administración
    Y los filtros de la auditoría están visibles
    Cuando oculta los filtros
    Entonces los filtros dejan de mostrarse
    Y el historial sigue mostrando los movimientos

  Esquema del escenario: La auditoría conserva los movimientos durante tres años
    Dado que el administrador inició sesión en el portal de administración
    Y existe un movimiento registrado hace <antigüedad>
    Cuando consulta la auditoría
    Entonces el movimiento <visibilidad>

    Ejemplos:
      | antigüedad          | visibilidad             |
      |               1 año | aparece en la auditoría |
      | 3 años menos un día | aparece en la auditoría |
      | más de 3 años       | ya no se conserva       |

  Escenario: El administrador descarga la auditoría de un módulo en PDF
    Dado que el administrador inició sesión en el portal de administración
    Y el módulo de fincas tiene movimientos registrados
    Cuando descarga en PDF la auditoría del módulo de fincas
    Entonces obtiene un documento PDF con los movimientos del módulo de fincas

  Escenario: La descarga en PDF respeta los filtros aplicados
    Dado que el administrador inició sesión en el portal de administración
    Y filtró la auditoría del módulo de fincas por la responsable "Ana"
    Cuando descarga en PDF la auditoría del módulo de fincas
    Entonces el PDF incluye solo los movimientos de la responsable "Ana"

  Esquema del escenario: Solo el administrador puede consultar la auditoría
    Dado que <quién> intenta acceder a la auditoría
    Cuando consulta la auditoría del módulo de fincas
    Entonces el sistema <resultado>

    Ejemplos:
      | quién                        | resultado               |
      | el administrador autenticado | muestra los movimientos |
      | un responsable autenticado   | niega el acceso         |
      | alguien sin autenticación    | niega el acceso         |
