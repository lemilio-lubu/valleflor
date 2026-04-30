# Referencia: Testing

Estrategia de testing para el monorepo Valleflor. La meta no es 100% de cobertura, sino confianza para cambiar el código.

## Tabla de Contenidos

1. Pirámide de tests
2. Backend — Unit tests (services)
3. Backend — Integration tests (repositorios)
4. Backend — E2E tests (HTTP)
5. Frontend — Component tests
6. Frontend — E2E con Playwright
7. Mocks vs Fakes
8. Cobertura y CI

---

## 1. Pirámide de Tests

```
        /\
       /E2E\          5–10%   (Playwright, supertest a flujos críticos)
      /------\
     / Integ. \       20–30%  (DB real, http stack completo, sin mocks)
    /----------\
   /   Unit     \     60–75%  (servicios, hooks, utilidades, sin I/O)
  /--------------\
```

**Reglas**:
- Tests unitarios deben ser **rápidos** (<1s cada uno) y **deterministas** (sin red, sin BD, sin filesystem).
- Tests de integración usan **infraestructura real** (Postgres en contenedor, no mock).
- Tests E2E cubren los **flujos críticos** del negocio, no exhaustivamente todo.
- Si un test es lento o flaky, eso es un problema. Investiga, no lo silencies.

---

## 2. Backend — Unit Tests (Services)

Probar la lógica de negocio del service con repositorios fake en memoria.

```ts
// users.service.spec.ts
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { USER_REPOSITORY } from '../domain/repositories/user.repository.token';
import { InMemoryUserRepository } from '../../test/fakes/in-memory-user.repository';
import { ConfigService } from '@/config/config.service';
import { EmailAlreadyTakenException } from '../domain/exceptions/email-already-taken.exception';

describe('UsersService', () => {
  let service: UsersService;
  let repo: InMemoryUserRepository;

  beforeEach(async () => {
    repo = new InMemoryUserRepository();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: USER_REPOSITORY, useValue: repo },
        { provide: ConfigService, useValue: { bcryptSaltRounds: 4 } }, // 4 = rápido para tests
      ],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe('create', () => {
    it('crea un usuario y hashea la contraseña', async () => {
      const result = await service.create({
        email: 'maria@valleflor.com',
        password: 'SecurePass123',
        fullName: 'María Gómez',
      });

      expect(result.id).toBeDefined();
      expect(result.email).toBe('maria@valleflor.com');
      // El passwordHash NO debe estar en la respuesta
      expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();

      const stored = await repo.findByEmail('maria@valleflor.com');
      expect(stored?.passwordHash).not.toBe('SecurePass123');
      expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
    });

    it('rechaza email duplicado', async () => {
      await service.create({
        email: 'maria@valleflor.com',
        password: 'SecurePass123',
        fullName: 'María',
      });

      await expect(
        service.create({
          email: 'maria@valleflor.com',
          password: 'OtherPass456',
          fullName: 'Otra',
        }),
      ).rejects.toBeInstanceOf(EmailAlreadyTakenException);
    });

    it('normaliza el email a minúsculas', async () => {
      // El DTO ya debería transformar; aquí se prueba que el service confíe en eso
      // pero se valida el comportamiento de búsqueda case-insensitive
    });
  });
});
```

**Reglas**:
- **Cada test independiente**: nuevo `beforeEach`, sin estado compartido.
- **Nombre del test descriptivo**: "rechaza email duplicado", no "test 1".
- **AAA**: Arrange, Act, Assert. Visualmente separados.
- **Bcrypt rounds = 4** en tests (rápido). En prod 12+.
- **Fakes en memoria** preferidos sobre mocks: simulan comportamiento real.

```ts
// test/fakes/in-memory-user.repository.ts
import { randomUUID } from 'crypto';
import { UserEntity } from '@/modules/users/domain/entities/user.entity';
import { UserRepository } from '@/modules/users/domain/repositories/user.repository';

export class InMemoryUserRepository implements UserRepository {
  private users = new Map<string, UserEntity>();

  async findById(id: string): Promise<UserEntity | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return [...this.users.values()].find((u) => u.email === email.toLowerCase()) ?? null;
  }

  async create(data: Partial<UserEntity>): Promise<UserEntity> {
    const user: UserEntity = {
      id: randomUUID(),
      email: data.email!,
      passwordHash: data.passwordHash!,
      fullName: data.fullName!,
      roles: data.roles ?? [],
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as UserEntity;
    this.users.set(user.id, user);
    return user;
  }

  // ...resto
}
```

---

## 3. Backend — Integration Tests (Repositorios)

Probar que el repositorio TypeORM funciona contra Postgres real.

**Stack**: `Testcontainers` para levantar Postgres efímero por test suite.

```ts
// typeorm-user.repository.int-spec.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { UserEntity } from '@/modules/users/domain/entities/user.entity';
import { TypeOrmUserRepository } from './typeorm-user.repository';

describe('TypeOrmUserRepository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  let repository: TypeOrmUserRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15.6-alpine').start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: [UserEntity],
      synchronize: true, // OK aquí: BD efímera
    });
    await dataSource.initialize();

    repository = new TypeOrmUserRepository(dataSource.getRepository(UserEntity));
  }, 60_000);

  afterAll(async () => {
    await dataSource.destroy();
    await container.stop();
  });

  beforeEach(async () => {
    await dataSource.getRepository(UserEntity).clear();
  });

  it('persiste y recupera por email', async () => {
    await repository.create({
      email: 'test@valleflor.com',
      passwordHash: 'hash',
      fullName: 'Test',
    });
    const found = await repository.findByEmail('test@valleflor.com');
    expect(found?.email).toBe('test@valleflor.com');
  });
});
```

**Reglas**:
- Sufijo `*.int-spec.ts` para diferenciarlos de unit tests.
- `synchronize: true` solo aceptable en BD efímera de tests.
- **No** usar SQLite como sustituto de Postgres: comportamientos divergentes (tipos, transacciones, JSONB).

---

## 4. Backend — E2E Tests (HTTP)

Probar el stack HTTP completo con `supertest`.

```ts
// test/users.e2e-spec.ts
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '@/app.module';

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /v1/users', () => {
    it('201: crea usuario válido', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/users')
        .send({
          email: 'e2e@valleflor.com',
          password: 'StrongPass123',
          fullName: 'E2E User',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('400: rechaza email inválido', async () => {
      await request(app.getHttpServer())
        .post('/v1/users')
        .send({ email: 'no-es-email', password: 'StrongPass123', fullName: 'X' })
        .expect(400);
    });

    it('400: rechaza propiedades extra (whitelist)', async () => {
      await request(app.getHttpServer())
        .post('/v1/users')
        .send({
          email: 'a@b.com',
          password: 'StrongPass123',
          fullName: 'X',
          isAdmin: true, // intento de privilege escalation
        })
        .expect(400);
    });
  });
});
```

**Reglas**:
- Una BD de test separada (no la de desarrollo).
- Limpiar entre tests (`TRUNCATE` o `dataSource.synchronize(true)` cuidadoso).
- Cubrir el "happy path" + validaciones críticas + errores esperados.
- Probar **autenticación**: endpoints sin token devuelven 401, con rol incorrecto 403.

---

## 5. Frontend — Component Tests

Stack: **Vitest** + **Testing Library**.

```tsx
// components/ui/button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renderiza el children', () => {
    render(<Button>Guardar</Button>);
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
  });

  it('dispara onClick al hacer click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('no dispara onClick si está disabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} disabled>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
```

**Reglas**:
- Buscar elementos por **rol** (`getByRole`) y **nombre accesible**, no por testid si se puede evitar.
- `userEvent` (no `fireEvent`) para simular interacciones reales.
- Probar **comportamiento del usuario**, no detalles de implementación.
- Sin tests de "renderiza sin romper": probar algo significativo o no probar.

---

## 6. Frontend — E2E con Playwright

```ts
// e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('usuario puede iniciar sesión y llegar al dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('demo@valleflor.com');
    await page.getByLabel('Contraseña').fill('DemoPass123!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: /bienvenida/i })).toBeVisible();
  });

  test('muestra error con credenciales inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('demo@valleflor.com');
    await page.getByLabel('Contraseña').fill('Wrong123!');
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page.getByText(/credenciales inválidas/i)).toBeVisible();
  });
});
```

**Reglas**:
- Cubrir **flujos críticos**: login, registro, creación de orden, checkout.
- BD de E2E separada, semilla controlada (fixtures).
- Correr en CI antes de merge a `main`.

---

## 7. Mocks vs Fakes

- **Fake (preferido)**: implementación alternativa que cumple el mismo contrato (ej. `InMemoryUserRepository`). Mantenible, refleja comportamiento real.
- **Stub**: respuesta predeterminada para una llamada concreta.
- **Mock**: con expectativas de cómo se llamó. Frágil, acoplado a implementación.
- **Spy**: observa llamadas sin cambiar comportamiento.

**Regla**: si te encuentras configurando 5+ mocks para un test, el diseño está mal acoplado. Refactoriza el código de producción, no agregues más mocks.

**Servicios externos** (APIs HTTP, S3, gateway de pago): siempre se mockean en unit tests, se prueban contra fakes/contenedores en integración.

---

## 8. Cobertura y CI

- Métrica de referencia: **70% líneas en services y hooks**, **50% en componentes UI**.
- **No** perseguir 100%: code review > cobertura.
- CI corre:
  1. Lint + format check.
  2. Type check (`tsc --noEmit`).
  3. Unit tests (rápidos, paralelos).
  4. Integration tests (con Postgres efímero).
  5. E2E tests (solo en main/PRs etiquetados).
  6. Build de imágenes Docker.

```yaml
# .github/workflows/ci.yml (ejemplo)
- run: npm ci
- run: npm run lint --workspaces
- run: npm run typecheck --workspaces
- run: npm run test --workspaces -- --coverage
- run: npm run test:int --workspace=apps/api
```

**PR no se mergea si** falla cualquier paso, incluso lint.

---

## Checklist de Testing

- [ ] Cada función pública nueva tiene al menos un test.
- [ ] Tests con nombres descriptivos del comportamiento.
- [ ] Sin estado compartido entre tests.
- [ ] Bcrypt con rounds bajos (4) en tests, no 12.
- [ ] Repositorios tienen fake en memoria.
- [ ] E2E cubre los flujos críticos (login, creación de recursos clave).
- [ ] Tests no leen variables de entorno reales (mockear o fixture).
- [ ] Sin tests flaky: si uno falla aleatoriamente, se investiga, no se "retry".
- [ ] CI corre lint + type + unit + integration.
- [ ] Componentes se prueban por comportamiento (Testing Library), no por implementación.
