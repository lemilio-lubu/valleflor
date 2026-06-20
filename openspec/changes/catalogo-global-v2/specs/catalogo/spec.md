# Spec delta — Catálogo (F3) y Vinculación (F4)

## MODIFIED Requirements

### Requirement: Catálogo único y estandarizado (F3)
La organización MANTENDRÁ un catálogo único y global de productos, variedades y colores,
compartido por toda la operación (sin pertenencia a una finca).

#### Scenario: Incorporación de una definición productiva al catálogo
La unidad del catálogo es la **definición productiva** = combinación producto + variedad + color.
El `codigo` y el `nombre` (comercial) identifican la combinación, NO el producto.
- **GIVEN** una definición productiva compuesta por producto, variedad y color
- **WHEN** el administrador la incorpora con su `codigo` y su `nombre`
- **THEN** la definición pasa a formar parte del catálogo oficial
- **AND** queda identificada por el `codigo` (único en todo el catálogo)
- **AND** la hoja (color) lleva también `longitud` y `tallos por caja`
- **AND** un mismo producto puede tener varias definiciones, cada una con su propio código/nombre

  Ejemplos:
  | producto  | variedad | color | codigo | nombre            |
  | BELLANDES | DARK     | DARK  | 6554   | NELANDES ASTASSUS |
  | BELLANDES | WHITE    | WHITE | 6898   | NELABANDES WHITE  |

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
