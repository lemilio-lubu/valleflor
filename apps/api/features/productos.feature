# language: es
Característica: Gestión del catálogo de productos
  Como administrador
  Quiero registrar productos en el catálogo global
  Para mantener actualizado el inventario de variedades

  Antecedentes:
    Dado que estoy autenticado como admin

  Escenario: Crear un producto nuevo
    Cuando creo un producto con código "ROS" y nombre "Rosa"
    Entonces la respuesta tiene estado 201
    Y el producto creado tiene código "ROS" y nombre "ROSA"

  Escenario: Rechazar un producto sin código
    Cuando creo un producto sin código y con nombre "Clavel"
    Entonces la respuesta tiene estado 400

  Escenario: Listar productos requiere autenticación
    Cuando consulto los productos sin token
    Entonces la respuesta tiene estado 401
