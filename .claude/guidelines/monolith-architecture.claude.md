# Guideline: Arquitectura Monolítica

> Documento de referencia para diseñar, estructurar y mantener sistemas monolíticos bien organizados. Aplicable a proyectos backend, fullstack o aplicaciones empresariales que no requieren la complejidad operativa de microservicios.

---

## 1. Principios Fundamentales

Un monolito **bien diseñado** no es sinónimo de código desordenado. Los siguientes principios guían toda decisión arquitectónica:

- **Separación clara de responsabilidades**: cada módulo tiene un propósito único y bien delimitado.
- **Bajo acoplamiento, alta cohesión**: los módulos se comunican mediante interfaces, no mediante detalles internos.
- **Independencia de frameworks**: la lógica de negocio no debe depender directamente del framework HTTP, ORM o librerías externas.
- **Testabilidad por defecto**: si algo es difícil de testear, probablemente está mal diseñado.
- **Preparado para extraer**: aunque sea monolito, debe estructurarse de modo que un módulo pueda convertirse en servicio independiente sin reescritura masiva.

---

## 2. Estructura de Carpetas Recomendada

La siguiente estructura combina principios de **Clean Architecture**, **Domain-Driven Design (DDD)** y **Screaming Architecture**:

```
src/
├── modules/                    # Módulos de dominio (bounded contexts)
│   ├── users/
│   │   ├── domain/            # Entidades, value objects, reglas de negocio puras
│   │   │   ├── entities/
│   │   │   ├── value-objects/
│   │   │   ├── repositories/  # Interfaces (contratos)
│   │   │   └── services/      # Servicios de dominio
│   │   ├── application/       # Casos de uso / orquestación
│   │   │   ├── use-cases/
│   │   │   ├── dtos/
│   │   │   └── ports/         # Interfaces de puertos externos
│   │   ├── infrastructure/    # Implementaciones concretas
│   │   │   ├── persistence/   # Repositorios concretos (DB)
│   │   │   ├── http/          # Controllers, rutas
│   │   │   └── adapters/      # Adaptadores a servicios externos
│   │   └── index.ts           # Punto de entrada del módulo (API pública)
│   │
│   ├── orders/
│   ├── products/
│   └── payments/
│
├── shared/                     # Código compartido entre módulos
│   ├── domain/                # Errores base, value objects genéricos
│   ├── infrastructure/        # Logger, config, db connection, eventos
│   ├── kernel/                # Tipos base, utilidades transversales
│   └── middleware/
│
├── config/                     # Configuración por entorno
│   ├── database.ts
│   ├── env.ts
│   └── app.ts
│
├── main.ts                    # Bootstrap / composition root
└── server.ts
```

### Reglas de oro sobre la estructura

1. **Los módulos NO se importan entre sí directamente**. Si `orders` necesita datos de `users`, lo hace mediante una interfaz expuesta por `users` o mediante eventos de dominio.
2. **El flujo de dependencias siempre apunta hacia el dominio**: `infrastructure → application → domain`. Nunca al revés.
3. **`shared/` no contiene lógica de negocio**, solo utilidades transversales.

---

## 3. Las Capas y su Responsabilidad

### Capa de Dominio (`domain/`)

Es el **corazón del sistema**. Aquí vive la lógica de negocio pura, sin dependencias externas.

- Entidades con identidad y comportamiento (no anémicas).
- Value Objects inmutables que representan conceptos del negocio.
- Interfaces de repositorio (contratos, no implementaciones).
- Excepciones de dominio.

**Prohibido aquí**: imports de Express, TypeORM, axios, fs, o cualquier librería externa.

### Capa de Aplicación (`application/`)

Orquesta los casos de uso. Es donde se coordina el dominio para cumplir una intención del usuario.

- Un caso de uso = una intención de negocio (ej. `CreateOrderUseCase`, `RegisterUserUseCase`).
- DTOs para entrada y salida de los casos de uso.
- No contiene lógica de negocio, solo coordinación.

### Capa de Infraestructura (`infrastructure/`)

Implementa los detalles técnicos: bases de datos, HTTP, colas, servicios externos.

- Controllers HTTP que reciben requests y llaman a casos de uso.
- Repositorios concretos que implementan las interfaces del dominio.
- Adaptadores a APIs externas, gateways de pago, servicios de email.

---

## 4. Comunicación Entre Módulos

Esta es la parte que **distingue un buen monolito de uno que se convierte en spaghetti**.

### Opción A: API pública del módulo

Cada módulo expone solo lo necesario en su `index.ts`:

```typescript
// modules/users/index.ts
export { UserPublicProfile } from './application/dtos/UserPublicProfile';
export { GetUserProfileUseCase } from './application/use-cases/GetUserProfileUseCase';
// El resto permanece privado al módulo
```

### Opción B: Eventos de dominio (preferido para desacoplar)

Cuando un módulo no necesita una respuesta inmediata del otro:

```typescript
// orders publica un evento
eventBus.publish(new OrderCreatedEvent(orderId, userId, total));

// notifications escucha y reacciona
eventBus.subscribe(OrderCreatedEvent, sendOrderConfirmationEmail);
```

Los eventos permiten que el monolito esté preparado para una eventual descomposición en microservicios.

---

## 5. Reglas de Configuración y Entorno

- Toda configuración se carga desde **variables de entorno** validadas al arranque (usar `zod`, `joi` o similar).
- Existe un único `config/` que centraliza el acceso a variables de entorno.
- Ningún módulo lee `process.env` directamente.
- Los secretos nunca se commitean: usar `.env.example` como plantilla.

---

## 6. Persistencia de Datos

- **Una sola base de datos** es válida en monolito, pero cada módulo accede solo a sus tablas.
- Las tablas se prefijan o se separan en schemas por módulo (`users_*`, `orders_*`).
- **Prohibido hacer JOINs entre tablas de módulos diferentes**. Si necesitas datos de otro módulo, usa su API pública.
- Las migraciones se versionan y se ejecutan automáticamente en deploy.

---

## 7. Testing

La estructura debe facilitar tres niveles de pruebas:

- **Unitarias**: dominio y casos de uso, sin tocar DB ni HTTP. Deben ser rápidas (<1s cada una).
- **Integración**: repositorios contra DB real (idealmente en contenedor) y casos de uso completos.
- **End-to-End**: flujos completos vía HTTP, en pocos casos críticos.

Regla práctica: si necesitas mockear más de 3 dependencias para un test unitario, el diseño está mal.

---

## 8. Observabilidad

Un monolito debe estar instrumentado desde el día uno:

- **Logging estructurado** (JSON) con correlation ID por request.
- **Métricas** expuestas en endpoint `/metrics` (Prometheus o similar).
- **Health check** en `/health` que verifica dependencias críticas (DB, cache, servicios externos).
- **Tracing distribuido** preparado, aunque sea monolito (facilita la futura migración).

---

## 9. Errores y Excepciones

- Cada módulo define sus propias excepciones de dominio (`UserNotFoundError`, `InsufficientStockError`).
- Un middleware HTTP global traduce excepciones de dominio a códigos HTTP apropiados.
- **Nunca** lanzar excepciones genéricas (`Error("something failed")`) desde el dominio.

---

## 10. Anti-patrones a Evitar

- **Big Ball of Mud**: carpetas por tipo técnico (`controllers/`, `services/`, `models/`) en vez de por dominio.
- **Modelos anémicos**: entidades que solo tienen getters/setters y la lógica vive en "services".
- **God Service**: una clase con cientos de métodos que hace de todo.
- **Acoplamiento por base de datos compartida**: módulos que se comunican leyendo tablas ajenas.
- **Configuración dispersa**: leer `process.env` desde cualquier archivo.
- **Imports circulares**: síntoma claro de que dos módulos están mal separados.

---

## 11. Cuándo NO Usar Monolito

Considera microservicios u otra arquitectura si:

- Diferentes partes del sistema requieren escalado independiente muy distinto.
- Equipos separados necesitan desplegar de forma independiente con frecuencia alta.
- Hay requisitos tecnológicos incompatibles entre módulos (un módulo necesita Python ML, otro Go de alto rendimiento).
- El sistema supera ~200k líneas de código y los tiempos de build/test se vuelven inmanejables.

En cualquier otro caso, **un monolito modular bien hecho es la opción correcta**.

---

## 12. Checklist Antes de Aprobar un PR

- [ ] El código nuevo respeta la estructura de capas (dominio sin dependencias externas).
- [ ] No hay imports cruzados entre módulos sin pasar por su API pública.
- [ ] Hay tests unitarios para la lógica de dominio nueva.
- [ ] Los nombres reflejan el lenguaje del negocio, no detalles técnicos.
- [ ] No se introducen variables de entorno sin documentar en `.env.example`.
- [ ] No hay `console.log` ni secretos commiteados.
- [ ] Las nuevas excepciones extienden de la jerarquía de errores de dominio del módulo.

---

## Referencias Recomendadas

- *Clean Architecture* — Robert C. Martin
- *Domain-Driven Design* — Eric Evans
- *Implementing Domain-Driven Design* — Vaughn Vernon
- *Building Evolutionary Architectures* — Neal Ford et al.
- *Monolith to Microservices* — Sam Newman (útil incluso si no piensas migrar)
