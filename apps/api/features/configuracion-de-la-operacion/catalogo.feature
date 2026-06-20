# language: es
Característica: Catalogación de productos
  Como administrador
  Quiero mantener un catálogo de productos estandarizado
  Para garantizar la consistencia de la información en toda la operación

  # Un "producto" es el tipo de flor (Rosa, Clavel) y se identifica por su código.

  Escenario: Registrar un producto en el catálogo
    Cuando el administrador registra el producto "Rosa" con código "ROS"
    Entonces el producto "Rosa" forma parte del catálogo con código "ROS"

  Escenario: Un producto necesita un código que lo identifique
    Cuando el administrador registra el producto "Clavel" sin código
    Entonces el sistema rechaza el producto por falta de código

  Escenario: Dos productos no pueden compartir el mismo código
    Dado que el catálogo contiene el producto "Freedom Red" con código "7001"
    Cuando el administrador registra el producto "Freedom Pink" con código "7001"
    Entonces el sistema rechaza el producto por código duplicado

  Escenario: Solo un usuario autenticado puede consultar el catálogo
    Cuando alguien sin autenticación consulta el catálogo de productos
    Entonces el sistema niega el acceso

  # Un "ítem de catálogo" es la combinación completa producto + variedad + color,
  # identificada por su código comercial.

  Esquema del escenario: Incorporar un ítem completo al catálogo
    Cuando el administrador incorpora al catálogo el ítem "<nombre>" con código "<codigo>", del producto "<producto>", variedad "<variedad>" y color "<color>"
    Entonces el ítem "<nombre>" queda registrado con su producto, variedad y color

    Ejemplos:
      | producto  | variedad | color | codigo | nombre            |
      | Bellandes | Dark     | Dark  | 6554   | Nelandes Astassus |
      | Bellandes | White    | White | 6898   | Nelabandes White  |
