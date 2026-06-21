# language: es
Característica: Catalogación de productos
  Como administrador
  Quiero mantener un catálogo de productos estandarizado
  Para garantizar la consistencia de la información en toda la operación

  # Un "producto" es el tipo de flor (Rosa, Clavel) y se identifica por su nombre.
  # El código comercial identifica al ítem (producto + variedad + color), no al producto.

  Escenario: Registrar un producto en el catálogo
    Cuando el administrador registra el producto "Rosa"
    Entonces el producto "Rosa" forma parte del catálogo

  Escenario: Un producto necesita un nombre que lo identifique
    Cuando el administrador registra el producto sin nombre
    Entonces el sistema rechaza el producto por falta de nombre

  Escenario: Dos productos no pueden compartir el mismo nombre
    Dado que el catálogo contiene el producto "Freedom"
    Cuando el administrador registra el producto "Freedom"
    Entonces el sistema rechaza el producto por nombre duplicado

  Escenario: Solo un usuario autenticado puede consultar el catálogo
    Cuando alguien sin autenticación consulta el catálogo de productos
    Entonces el sistema niega el acceso

  # Un "ítem de catálogo" es la combinación completa producto + variedad + color,
  # identificada por su código comercial.

  Esquema del escenario: Incorporar un ítem completo al catálogo
    Cuando el administrador incorpora al catálogo el ítem "<nombre>" con código "<codigo>", del producto "<producto>", variedad "<variedad>" y color "<color>"
    Entonces el ítem "<nombre>" queda registrado con su producto, variedad y color

  Escenario: Un ítem necesita un código que lo identifique
    Cuando el administrador incorpora al catálogo un ítem sin código, del producto "Rosa", variedad "Freedom" y color "Red"
    Entonces el sistema rechaza el ítem por falta de código

  Escenario: Dos ítems no pueden compartir el mismo código
    Dado que el catálogo contiene el ítem "Freedom Cherry" con código "8001", del producto "Freedom", variedad "Red" y color "Cherry"
    Cuando el administrador incorpora al catálogo el ítem "Mondial Light" con código "8001", del producto "Mondial", variedad "Pink" y color "Light"
    Entonces el sistema rechaza el ítem por código duplicado

    Ejemplos:
      | producto  | variedad | color | codigo | nombre            |
      | Bellandes | Dark     | Dark  | 6554   | Nelandes Astassus |
      | Bellandes | White    | White | 6898   | Nelabandes White  |
