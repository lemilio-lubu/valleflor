# language: es
Característica: Registro de la plantilla diaria
  Como responsable de una finca
  Quiero registrar las cajas producidas cada día
  Para que el sistema calcule los tallos y consolide la producción

  # Tallos por caja del producto "Freedom" = 400 (valor por defecto del catálogo),
  # por eso 10 cajas equivalen a 4000 tallos.

  Antecedentes:
    Dado que la finca "Norte" está registrada
    Y que Ana es responsable operativa
    Y Ana es responsable de "Norte"
    Y que el catálogo contiene el ítem "Freedom Cherry" con código "8001", del producto "Freedom", variedad "Red" y color "Cherry"
    Y Ana tiene asignado el color del ítem
    Y que Ana ha iniciado sesión
    Y que Ana ha creado la semana 30 de 2026

  Escenario: Registrar cajas calcula los tallos automáticamente
    Cuando Ana registra 10 cajas el lunes
    Entonces el registro del lunes refleja 10 cajas y 4000 tallos

  Escenario: Las cajas se redondean a dos decimales
    Cuando Ana registra 10.005 cajas el lunes
    Entonces el registro del lunes refleja 10.01 cajas y 4004 tallos

  Escenario: Un valor inusualmente alto genera una advertencia
    Dado que Ana ha registrado 10 cajas cada día de lunes a viernes
    Cuando Ana registra 100 cajas el sabado
    Entonces el sistema acepta el registro con una advertencia

  Escenario: Cambiar el divisor recalcula los tallos del registro
    Dado que Ana ha registrado 10 cajas el lunes
    Cuando Ana ajusta el divisor del registro del lunes a 25
    Entonces el registro recalculado refleja 250 tallos con divisor 25

  Escenario: La plantilla refleja el divisor ajustado por registro
    Dado que Ana ha registrado 10 cajas el lunes
    Cuando Ana ajusta el divisor del registro del lunes a 25
    Entonces la plantilla muestra el registro del lunes con 250 tallos y divisor 25

  Escenario: Actualizar varios registros en una sola operación
    Cuando Ana registra en lote 10 cajas el lunes y 20 cajas el martes
    Entonces el lote refleja 4000 y 8000 tallos respectivamente

  Escenario: Recalcular todos los registros mantiene los tallos consistentes
    Dado que Ana ha registrado 10 cajas el lunes
    Y que Ana ha registrado 20 cajas el martes
    Cuando el administrador recalcula todos los registros
    Entonces el recálculo reporta 7 registros actualizados

  Escenario: Cambiar los tallos por caja del producto aplica a nuevos registros de cajas
    Dado que Ana ha registrado 10 cajas el lunes
    Cuando el administrador cambia los tallos por caja del producto a 50
    Y Ana registra 10 cajas el martes
    Entonces el registro del martes refleja 10 cajas y 500 tallos

  Escenario: No se aceptan cajas negativas
    Cuando Ana intenta registrar -5 cajas el lunes
    Entonces el sistema rechaza la operación por datos inválidos

  Escenario: No se acepta un divisor menor que uno
    Cuando Ana intenta ajustar el divisor del registro del lunes a 0
    Entonces el sistema rechaza la operación por datos inválidos
