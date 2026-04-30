# Referencia: TypeORM + PostgreSQL 15 (`apps/api`)

Reglas y patrones para persistencia con TypeORM contra PostgreSQL 15.

## Tabla de Contenidos

1. Configuración del DataSource
2. Entities — convenciones
3. Repositorios (patrón abstracción)
4. Migraciones (siempre, nunca synchronize en producción)
5. Transacciones
6. Soft delete y auditoría
7. Índices y rendimiento
8. Queries: cuándo usar QueryBuilder
9. Naming de tablas y columnas
10. UUIDs vs autoincrement

---

## 1. Configuración del DataSource

Mantener la configuración separada para que la CLI de TypeORM la pueda usar sin instanciar Nest.

```ts
// src/database/data-source.ts
import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

loadEnv();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  migrationsTableName: 'typeorm_migrations',
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,           // OBLIGATORIO: nunca true
  migrationsRun: false,         // ejecutar manualmente
  logging: process.env.API_NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
};

export const AppDataSource = new DataSource(dataSourceOptions);
```

**Reglas inflexibles**:
- `synchronize: false` siempre. En desarrollo, en CI, en producción. **Cero excepciones**.
- `SnakeNamingStrategy` para que TypeScript sea camelCase y la BD snake_case.
- `migrationsTableName` explícito para evitar conflictos.

Integración con Nest:

```ts
// app.module.ts
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    ...dataSourceOptions,
    host: config.postgres.host,
    port: config.postgres.port,
    username: config.postgres.user,
    password: config.postgres.password,
    database: config.postgres.database,
  }),
}),
```

Scripts en `package.json`:
```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
    "migration:generate": "npm run typeorm -- migration:generate src/database/migrations/$npm_config_name",
    "migration:create": "typeorm-ts-node-commonjs migration:create src/database/migrations/$npm_config_name",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert"
  }
}
```

Uso: `npm run migration:generate --name=AddUserRoles`.

---

## 2. Entities — Convenciones

```ts
// src/modules/users/domain/entities/user.entity.ts
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 72 })
  passwordHash!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 120 })
  fullName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.USER],
  })
  roles!: UserRole[];

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
```

**Reglas**:
- `id` siempre `uuid` generado en BD (`uuid_generate_v4()` o `gen_random_uuid()`).
- Nombrar tablas en plural y snake_case (`users`, `order_items`).
- Tipos de columna explícitos: `varchar` con `length`, `text` solo cuando se justifique, `numeric` para dinero (no `float`).
- Timestamps siempre `timestamptz` (con timezone, almacena en UTC).
- `created_at`, `updated_at`, `deleted_at` en toda entity (auditoría base).
- Booleanos siempre con `default` explícito.
- Strings con `length` definido (evita columnas TEXT sin control).
- Money: `@Column({ type: 'numeric', precision: 12, scale: 2 })`.
- Enums: usar el tipo enum nativo de Postgres (`type: 'enum'`).
- Arrays de enum requieren `array: true`.

**Relaciones**:
```ts
@ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'user_id' })
user!: UserEntity;

@Column({ name: 'user_id', type: 'uuid' })
userId!: string;
```

Siempre exponer la columna FK (`userId`) como propiedad además de la relación, facilita queries sin cargar la relación completa.

---

## 3. Repositorios (Patrón Abstracción)

Para módulos con lógica compleja, definir interfaz en dominio e implementación en infraestructura. Para CRUD simple, usar `Repository<Entity>` de TypeORM directamente.

```ts
// domain/repositories/user.repository.token.ts
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

// domain/repositories/user.repository.ts
import { UserEntity } from '../entities/user.entity';

export interface UserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(data: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, data: Partial<UserEntity>): Promise<UserEntity>;
  softDelete(id: string): Promise<void>;
}
```

```ts
// infrastructure/persistence/typeorm-user.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../domain/entities/user.entity';
import { UserRepository } from '../../domain/repositories/user.repository';

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase() } });
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
    await this.repo.update(id, data);
    const updated = await this.findById(id);
    if (!updated) throw new Error(`User ${id} disappeared after update`);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
```

**Beneficio**: en tests, el service recibe un `UserRepository` fake en memoria. Sin TypeORM, sin Postgres.

---

## 4. Migraciones

**`synchronize: true` está prohibido**. Toda modificación del schema pasa por una migración versionada.

Flujo:
1. Modifico la entity.
2. Ejecuto `npm run migration:generate --name=DescriptiveName`.
3. Reviso la migración generada (no confiar ciegamente; ajustar índices, nombres, defaults).
4. La commiteo junto con el cambio de entity.
5. La migración se ejecuta en CI/CD como paso de deploy (`migration:run`).

**Una migración bien hecha**:
- Tiene `up()` y `down()` simétricos. El `down()` debe revertir exactamente el `up()`.
- No incluye lógica de negocio (no hace SELECTs/UPDATEs masivos sin razón clara).
- Si necesita backfill de datos, va en una migración separada y se documenta.
- Nombre descriptivo en PascalCase: `1716234567890-AddRefreshTokenTable.ts`.

**Migraciones de datos** (data migrations) van en archivos separados con prefijo claro:
```
src/database/migrations/
├── 1716234567000-CreateUsersTable.ts        # schema
├── 1716234567500-CreateOrdersTable.ts        # schema
└── 1716234568000-data-MigrateLegacyEmails.ts # data
```

**Nunca editar una migración ya mergeada a main**. Si hay error, crear una nueva migración correctiva.

---

## 5. Transacciones

Cualquier operación que modifique más de una tabla (o múltiples registros que deban ser consistentes) **debe ir en transacción**.

Forma preferida con `DataSource.transaction()`:

```ts
@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(STOCK_SERVICE) private readonly stockService: StockService,
  ) {}

  async createOrder(dto: CreateOrderDto, userId: string): Promise<OrderEntity> {
    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(OrderEntity, { userId, total: 0 });
      await manager.save(order);

      let total = 0;
      for (const item of dto.items) {
        await this.stockService.reserve(manager, item.productId, item.quantity);
        const lineTotal = await this.calculateLine(manager, item);
        total += lineTotal;
        await manager.save(
          manager.create(OrderItemEntity, { orderId: order.id, ...item, lineTotal }),
        );
      }

      order.total = total;
      return manager.save(order);
    });
  }
}
```

**Reglas**:
- Pasar `manager` (EntityManager) por parámetro a métodos auxiliares; no usar repositorios inyectados dentro de la transacción (operan fuera de ella).
- Si la lógica externa lanza, la transacción hace rollback automáticamente.
- No anidar `dataSource.transaction()` dentro de otra; usar el `manager` recibido.

Para casos donde se necesita control fino (savepoints, isolation levels), usar `QueryRunner` manualmente.

---

## 6. Soft Delete y Auditoría

- Toda entity con datos relevantes para negocio o auditoría usa `@DeleteDateColumn`.
- Las queries normales **no devuelven** registros soft-deleted (TypeORM lo maneja automáticamente con `softDelete()` y `withDeleted: true` para incluirlos).
- Para auditoría más profunda (quién hizo qué cuándo), considerar tabla `audit_log` separada o trigger en Postgres.

```ts
// Listar incluyendo soft-deleted
this.repo.find({ withDeleted: true });

// Restaurar
await this.repo.restore(id);
```

---

## 7. Índices y Rendimiento

- **Índice en toda FK** (TypeORM no lo crea automáticamente en algunas versiones).
- **Índice único** en columnas que se buscan por igualdad y deben ser únicas (`email`).
- **Índice compuesto** cuando se busca por varias columnas juntas (`@Index(['userId', 'createdAt'])`).
- **No abusar** de índices: cada índice ralentiza inserts/updates.

```ts
@Index(['userId', 'createdAt'])
@Entity({ name: 'orders' })
export class OrderEntity { ... }
```

**Para datos grandes**:
- Paginar siempre (cursor-based para feeds, offset para administración).
- `take` y `skip` en queries de listado.
- Evitar `find()` sin `where`.
- Para queries pesadas, usar `EXPLAIN ANALYZE` en Postgres y revisar planes.

---

## 8. Queries: Cuándo Usar QueryBuilder

- **Repository methods** (`findOne`, `find`, `update`): para queries simples (1 tabla, filtros básicos).
- **QueryBuilder**: cuando hay joins, subqueries, agregaciones o lógica condicional.
- **Raw SQL** (`dataSource.query`): solo como último recurso. Si lo usas, parametriza siempre (`$1`, `$2`).

```ts
// QueryBuilder ejemplo
async findActiveOrdersWithItems(userId: string) {
  return this.repo
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.items', 'item')
    .leftJoinAndSelect('item.product', 'product')
    .where('order.userId = :userId', { userId })
    .andWhere('order.status = :status', { status: OrderStatus.ACTIVE })
    .orderBy('order.createdAt', 'DESC')
    .getMany();
}
```

**Prohibido**: concatenar strings en SQL (`WHERE id = '${id}'`). Inyección SQL inmediata. Usar parámetros nombrados siempre.

---

## 9. Naming de Tablas y Columnas

Con `SnakeNamingStrategy`, tu código TypeScript es camelCase y la BD es snake_case:

| TypeScript | PostgreSQL |
|------------|-----------|
| `UserEntity` (`@Entity()` sin name) | `user` (singular, no ideal) |
| `@Entity({ name: 'users' })` | `users` ✓ |
| `firstName` | `first_name` |
| `createdAt` | `created_at` |

**Recomendación**: definir siempre `@Entity({ name: 'plural_name' })` explícitamente para evitar ambigüedad.

---

## 10. UUIDs vs Autoincrement

Usar **UUIDs** por defecto en todo el sistema:

- Generación distribuida sin coordinación.
- No exponen información del orden o tamaño.
- Compatibles con futuros microservicios o sharding.
- Postgres 15 tiene `gen_random_uuid()` nativo (no requiere extensión).

```ts
@PrimaryGeneratedColumn('uuid')
id!: string;
```

**Solo usar autoincrement** en tablas internas (logs, counters) donde el orden importa y no se exponen al exterior.

---

## Checklist Antes de Aprobar Código de TypeORM

- [ ] `synchronize: false` está activo.
- [ ] Hay migración para todo cambio de schema.
- [ ] La migración tiene `up()` y `down()` simétricos.
- [ ] Tipos de columna explícitos, longitudes definidas.
- [ ] Timestamps con `timestamptz`.
- [ ] FKs tienen su columna expuesta y `onDelete` definido.
- [ ] Hay índices en FKs y campos de búsqueda frecuente.
- [ ] Queries que tocan múltiples tablas están en transacción.
- [ ] No hay SQL concatenado con strings.
- [ ] Soft delete configurado en entities con datos sensibles.
- [ ] Repositorios complejos están detrás de una interfaz inyectable.
