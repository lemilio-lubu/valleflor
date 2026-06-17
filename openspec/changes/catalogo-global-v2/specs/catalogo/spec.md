# Spec delta — Catálogo (F3) y Vinculación (F4)

## MODIFIED Requirements

### Requirement: Catálogo único y estandarizado (F3)
La organización MANTENDRÁ un catálogo único y global de productos, variedades y colores,
compartido por toda la operación (sin pertenencia a una finca).

#### Scenario: Incorporación de un producto al catálogo
- **WHEN** el administrador incorpora un producto al catálogo
- **THEN** el producto pasa a formar parte de las definiciones estandarizadas de la organización
- **AND** dispone de un código de identificación único
- **AND** dispone de un nombre
- **AND** dispone de una longitud
- **AND** dispone de tallos por caja
- **AND** dispone de al menos una variedad
- **AND** dispone de una clasificación por color

#### Scenario: Registro de producto existente
- **GIVEN** un producto que ya forma parte del catálogo (mismo código)
- **WHEN** se intenta incorporarlo nuevamente
- **THEN** el catálogo mantiene una única representación del producto

#### Scenario: Atributos productivos a nivel producto
- **GIVEN** un producto con varias variedades y colores
- **WHEN** se consulta la caja (tallos por caja) o la longitud
- **THEN** el valor proviene del producto y aplica a todos sus colores

## ADDED Requirements

### Requirement: Vinculación granular de productos (F4)
El administrador PODRÁ asociar a un responsable un producto completo, variedades sueltas o
colores sueltos. La asociación se materializa a nivel color (los registros referencian color).

#### Scenario: Asignación de producto completo
- **GIVEN** una finca con un responsable asignado y un producto catalogado
- **WHEN** el administrador asigna el producto al responsable
- **THEN** todos los colores activos del producto quedan asociados al responsable

#### Scenario: Asignación de variedades
- **GIVEN** una finca con un responsable y variedades catalogadas
- **WHEN** el administrador asigna variedades específicas al responsable
- **THEN** los colores activos de esas variedades quedan asociados al responsable

#### Scenario: Asignación de colores
- **GIVEN** una finca con un responsable y colores catalogados
- **WHEN** el administrador asigna colores específicos al responsable
- **THEN** esos colores quedan asociados al responsable

#### Scenario: Reconciliación de semanas tras asignar
- **WHEN** cambian las asignaciones de un responsable
- **THEN** las semanas actual y futuras se reconcilian (agregan/eliminan registros) según las
  nuevas asignaciones

## REMOVED Requirements

### Requirement: Catálogo por finca
**Reason**: Reemplazado por catálogo único global (F3).
**Migration**: Regeneración desde cero — reset de catálogo + registros + semanas y re-import vía
carga masiva con el CSV nuevo.
