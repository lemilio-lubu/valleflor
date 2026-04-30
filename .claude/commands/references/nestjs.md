# Referencia: NestJS 10 (`apps/api`)

Patrones y reglas para escribir código NestJS mantenible, testeable y seguro.

## Tabla de Contenidos

1. Estructura de un módulo
2. Controllers
3. Services y lógica de negocio
4. DTOs y validación con class-validator
5. Pipes
6. Guards
7. Interceptors
8. Exception Filters
9. Decoradores personalizados
10. Configuración tipada y validada
11. Logging
12. CORS, helmet, rate limiting
13. Versionado de API
14. Estructura de carpetas recomendada

---

## 1. Estructura de un Módulo

Cada módulo de dominio sigue esta estructura interna (Clean Architecture pragmática):

```
src/modules/users/
├── domain/                       # Lógica pura del dominio
│   ├── entities/
│   │   └── user.entity.ts        # Entity de TypeORM (excepción justificada por simplicidad)
│   ├── repositories/
│   │   └── user.repository.ts    # Interfaz abstracta
│   └── exceptions/
│       └── user-not-found.exception.ts
├── application/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   └── user-response.dto.ts
│   ├── services/
│   │   └── users.service.ts
│   └── use-cases/                # Solo si los use-cases son complejos
│       └── register-user.use-case.ts
├── infrastructure/
│   ├── http/
│   │   └── users.controller.ts
│   ├── persistence/
│   │   └── typeorm-user.repository.ts  # Implementación concreta
│   └── mappers/
│       └── user.mapper.ts        # Entity ↔ DTO
└── users.module.ts
```

Para módulos simples (CRUD sin reglas complejas) se puede aplanar a:
```
src/modules/products/
├── dto/
├── entities/
├── products.controller.ts
├── products.service.ts
└── products.module.ts
```

**Regla**: empieza simple. Cuando un módulo crezca y la lógica de negocio se vuelva compleja, refactoriza a la estructura completa.

---

## 2. Controllers

Los controllers **solo** se ocupan de:
- Recibir la request HTTP.
- Validar (vía pipes y DTOs).
- Llamar al service correspondiente.
- Devolver la respuesta.

**Nunca** contienen lógica de negocio, queries directas a la BD ni transformaciones complejas.

```ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UsersService } from '../application/services/users.service';
import { CreateUserDto } from '../application/dto/create-user.dto';
import { UserResponseDto } from '../application/dto/user-response.dto';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.usersService.findById(user.id);
  }
}
```

**Reglas**:
- Decorar siempre con `@HttpCode` cuando el código no sea el predeterminado (ej. `201` para creates).
- Usar `@Param('id', ParseUUIDPipe)` para validar UUIDs en la ruta.
- Devolver siempre **DTOs de respuesta**, nunca entities directamente (evita filtrar campos sensibles).
- Endpoints autenticados protegidos con `@UseGuards(JwtAuthGuard)`.
- Versionar la API: `@Controller({ path: 'users', version: '1' })`.

---

## 3. Services y Lógica de Negocio

Los services contienen la lógica. Reglas:

- Inyectan el repositorio (no el `Repository` de TypeORM directamente, sino la interfaz del dominio).
- Devuelven DTOs ya transformados (usar mappers).
- Lanzan excepciones de dominio, no `HttpException` directamente.
- Cada método público es testeable de forma aislada.

```ts
import { Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@/config/config.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.token';
import { UserNotFoundException } from '../../domain/exceptions/user-not-found.exception';
import { EmailAlreadyTakenException } from '../../domain/exceptions/email-already-taken.exception';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserMapper } from '../../infrastructure/mappers/user.mapper';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new EmailAlreadyTakenException(dto.email);
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.bcryptSaltRounds,
    );

    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
    });

    return UserMapper.toResponse(user);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundException(id);
    }
    return UserMapper.toResponse(user);
  }
}
```

**Por qué `@Inject(USER_REPOSITORY)`**: permite intercambiar la implementación de TypeORM por un fake en tests sin tocar el service.

```ts
// users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './domain/entities/user.entity';
import { UsersService } from './application/services/users.service';
import { UsersController } from './infrastructure/http/users.controller';
import { TypeOrmUserRepository } from './infrastructure/persistence/typeorm-user.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository.token';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: TypeOrmUserRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## 4. DTOs y Validación

DTOs son la **única** forma de aceptar datos del exterior. Reglas:

- Un DTO por operación (`CreateUserDto`, `UpdateUserDto`, `UserResponseDto`).
- Los DTOs de entrada usan `class-validator` para validar.
- Los DTOs de respuesta usan `class-transformer` para excluir campos sensibles.
- `UpdateUserDto` se construye con `PartialType` o `OmitType` de `@nestjs/mapped-types`.

```ts
// create-user.dto.ts
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  Matches,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email inválido' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @MinLength(12, { message: 'La contraseña debe tener al menos 12 caracteres' })
  @MaxLength(72, { message: 'Máximo 72 caracteres (límite de bcrypt)' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contraseña debe incluir mayúsculas, minúsculas y números',
  })
  password!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => value?.trim())
  fullName!: string;
}
```

```ts
// update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {}
```

```ts
// user-response.dto.ts
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose() id!: string;
  @Expose() email!: string;
  @Expose() fullName!: string;
  @Expose() createdAt!: Date;

  // passwordHash NO se expone — al estar excluido por defecto, está protegido
}
```

**Configuración global obligatoria** en `main.ts`:

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // descarta props no declaradas en el DTO
    forbidNonWhitelisted: true, // lanza error si llegan props extra
    transform: true,            // convierte payloads a instancias de clase
    transformOptions: {
      enableImplicitConversion: false, // ser explícitos con tipos
    },
  }),
);
```

**Importante**: limitar contraseñas a 72 caracteres (límite real de bcrypt; cualquier byte extra se trunca silenciosamente).

---

## 5. Pipes

Usar pipes para transformar y validar parámetros simples:

- `ParseUUIDPipe` — UUIDs en parámetros.
- `ParseIntPipe` — números enteros.
- `ValidationPipe` — DTOs (configurado globalmente).
- Pipes custom solo cuando los anteriores no aplican.

```ts
@Get(':id')
findOne(@Param('id', ParseUUIDPipe) id: string) { ... }
```

Para query strings con DTO, crear un DTO con `@IsOptional`:

```ts
export class FindUsersQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}

@Get()
findAll(@Query() query: FindUsersQueryDto) { ... }
```

---

## 6. Guards

Guards autorizan el acceso a un endpoint. Reglas:

- Un guard hace **una sola cosa** (autenticación O autorización por roles, no ambas).
- Los guards no contienen lógica de negocio.
- Las decisiones de roles se hacen con metadata + `Reflector`.

```ts
// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles?.length) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}

// roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// uso
@Get('admin/stats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
getStats() { ... }
```

---

## 7. Interceptors

Para transversal: logging, transform de respuestas, métricas.

```ts
// logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const start = Date.now();
    const { method, url } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(`${method} ${url} - ${Date.now() - start}ms`);
        },
        error: (err: Error) => {
          this.logger.error(
            `${method} ${url} - ${Date.now() - start}ms - ${err.message}`,
          );
        },
      }),
    );
  }
}
```

**Para transformar todas las respuestas en un envelope** (`{ data, meta }`), usar un `ClassSerializerInterceptor` global más uno custom:

```ts
app.useGlobalInterceptors(
  new ClassSerializerInterceptor(app.get(Reflector)),
  new ResponseTransformInterceptor(),
);
```

---

## 8. Exception Filters

Una excepción de dominio se mapea a un código HTTP en un filtro. **No lances `HttpException` desde un service**.

```ts
// domain-exception.filter.ts
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof UserNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
      errorCode = 'USER_NOT_FOUND';
    } else if (exception instanceof EmailAlreadyTakenException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
      errorCode = 'EMAIL_ALREADY_TAKEN';
    } else if (exception instanceof InvalidCredentialsException) {
      status = HttpStatus.UNAUTHORIZED;
      message = 'Credenciales inválidas';
      errorCode = 'INVALID_CREDENTIALS';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const r = exception.getResponse();
      message = typeof r === 'string' ? r : (r as { message: string }).message;
      errorCode = HttpStatus[status] ?? 'HTTP_ERROR';
    } else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

Registrar global en `main.ts`:
```ts
app.useGlobalFilters(new DomainExceptionFilter());
```

---

## 9. Decoradores Personalizados

Crear decoradores para extraer datos del contexto cuando se repiten:

```ts
// current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);

// uso
@Get('me')
profile(@CurrentUser() user: AuthenticatedUser) { ... }

@Get('email')
email(@CurrentUser('email') email: string) { ... }
```

---

## 10. Configuración Tipada y Validada

**Nunca** leer `process.env` directamente. Crear un módulo de config con validación.

```ts
// config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import {
  IsEnum, IsInt, IsString, MinLength, validateSync, Min, Max,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv) API_NODE_ENV!: NodeEnv;
  @IsInt() @Min(1) @Max(65535) API_PORT!: number;

  @IsString() @MinLength(1) POSTGRES_HOST!: string;
  @IsInt() @Min(1) @Max(65535) POSTGRES_PORT!: number;
  @IsString() @MinLength(1) POSTGRES_USER!: string;
  @IsString() @MinLength(1) POSTGRES_PASSWORD!: string;
  @IsString() @MinLength(1) POSTGRES_DB!: string;

  @IsString() @MinLength(32) JWT_ACCESS_SECRET!: string;
  @IsString() JWT_ACCESS_EXPIRES_IN!: string;
  @IsString() @MinLength(32) JWT_REFRESH_SECRET!: string;
  @IsString() JWT_REFRESH_EXPIRES_IN!: string;

  @IsInt() @Min(10) @Max(15) BCRYPT_SALT_ROUNDS!: number;

  @IsString() CORS_ORIGIN!: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(
      `Configuración inválida:\n${errors.map((e) => e.toString()).join('\n')}`,
    );
  }
  return validated;
}
```

```ts
// config/config.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { ConfigService } from './config.service';
import { validateEnv } from './env.validation';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      validate: validateEnv,
      cache: true,
      expandVariables: true,
    }),
  ],
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

```ts
// config/config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { EnvironmentVariables, NodeEnv } from './env.validation';

@Injectable()
export class ConfigService {
  constructor(private readonly nest: NestConfigService<EnvironmentVariables, true>) {}

  get nodeEnv(): NodeEnv { return this.nest.get('API_NODE_ENV', { infer: true }); }
  get port(): number { return this.nest.get('API_PORT', { infer: true }); }
  get isProduction(): boolean { return this.nodeEnv === NodeEnv.Production; }

  get postgres() {
    return {
      host: this.nest.get('POSTGRES_HOST', { infer: true }),
      port: this.nest.get('POSTGRES_PORT', { infer: true }),
      user: this.nest.get('POSTGRES_USER', { infer: true }),
      password: this.nest.get('POSTGRES_PASSWORD', { infer: true }),
      database: this.nest.get('POSTGRES_DB', { infer: true }),
    };
  }

  get jwtAccess() {
    return {
      secret: this.nest.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.nest.get('JWT_ACCESS_EXPIRES_IN', { infer: true }),
    };
  }

  get jwtRefresh() {
    return {
      secret: this.nest.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: this.nest.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
    };
  }

  get bcryptSaltRounds(): number {
    return this.nest.get('BCRYPT_SALT_ROUNDS', { infer: true });
  }

  get corsOrigin(): string { return this.nest.get('CORS_ORIGIN', { infer: true }); }
}
```

---

## 11. Logging

Usar el `Logger` de Nest, no `console.log`.

```ts
private readonly logger = new Logger(MyService.name);

this.logger.log('Operación exitosa');
this.logger.warn('Algo inesperado');
this.logger.error('Falló', error.stack);
this.logger.debug('Detalle interno'); // solo en dev
```

En producción, considerar `nestjs-pino` para logs estructurados JSON con correlation ID:

```ts
import { LoggerModule } from 'nestjs-pino';

LoggerModule.forRoot({
  pinoHttp: {
    level: isProd ? 'info' : 'debug',
    transport: isProd ? undefined : { target: 'pino-pretty' },
    redact: ['req.headers.authorization', 'req.body.password'],
    customProps: (req) => ({ correlationId: req.headers['x-correlation-id'] }),
  },
});
```

---

## 12. CORS, Helmet, Rate Limiting

En `main.ts`:

```ts
import helmet from 'helmet';
import { ThrottlerGuard } from '@nestjs/throttler';

app.use(helmet());
app.enableCors({
  origin: config.corsOrigin.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
```

Rate limiting con `@nestjs/throttler` (en `AppModule`):

```ts
ThrottlerModule.forRoot([
  { name: 'short', ttl: 1000, limit: 5 },     // 5 req/segundo
  { name: 'medium', ttl: 60_000, limit: 100 }, // 100 req/minuto
]),
```

Endpoints sensibles (login) con throttle más estricto:
```ts
@Throttle({ short: { limit: 3, ttl: 60_000 } })
@Post('login')
login(...) { }
```

---

## 13. Versionado de API

Habilitar en `main.ts`:
```ts
app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
```

Controllers usan `@Controller({ path: 'users', version: '1' })`. Esto produce rutas tipo `/v1/users`. Cuando se haga un cambio incompatible, crear `users-v2.controller.ts` con `version: '2'`.

---

## 14. Estructura de Carpetas

```
src/
├── modules/
│   ├── users/
│   ├── auth/
│   ├── orders/
│   └── ...
├── shared/                  # Helpers neutros (no dependen de Nest)
│   ├── pagination/
│   ├── result/
│   └── types/
├── common/                  # Plumbing de Nest
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   └── pipes/
├── config/
│   ├── config.module.ts
│   ├── config.service.ts
│   └── env.validation.ts
├── database/
│   ├── data-source.ts
│   └── migrations/
├── app.module.ts
└── main.ts
```

---

## Checklist Antes de Aprobar Código de NestJS

- [ ] Controller no contiene lógica de negocio.
- [ ] Service no usa `@Res()` ni objetos HTTP directamente.
- [ ] DTO de entrada con `class-validator` para todos los campos.
- [ ] DTO de respuesta excluye campos sensibles (`@Exclude()` + `@Expose()`).
- [ ] Excepciones de dominio mapeadas en el filter, no `HttpException` en services.
- [ ] Endpoints autenticados protegidos con guards.
- [ ] Sin imports relativos profundos (usar alias `@/`).
- [ ] Sin `any` ni `process.env` fuera de config.
- [ ] Tests unitarios al service y e2e al endpoint.
- [ ] No quedan `console.log`.
