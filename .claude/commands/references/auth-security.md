# Referencia: Autenticación y Seguridad

Patrones para autenticación con Passport + JWT, hashing con Bcrypt, y aplicación del OWASP Top 10 al stack Valleflor.

## Tabla de Contenidos

1. Hashing de contraseñas con Bcrypt
2. JWT: estrategia de access + refresh
3. Passport strategies (Local + JWT)
4. Auth module — estructura
5. Login, logout, refresh
6. Guards de autenticación y roles
7. Política de contraseñas
8. OWASP Top 10 aplicado
9. Headers de seguridad
10. Rate limiting de endpoints sensibles
11. Logs de auditoría
12. Anti-patrones de seguridad

---

## 1. Hashing de Contraseñas con Bcrypt

**Reglas inflexibles**:
- Bcrypt **siempre**, nunca SHA-256, MD5 o "encriptación reversible".
- `saltRounds = 12` por defecto. Subir a 13–14 si el hardware lo permite.
- Bcrypt limita el input a **72 bytes**. Validar `MaxLength(72)` en el DTO.
- **Nunca** loggear, devolver, ni comparar contraseñas en plano.
- Comparar siempre con `bcrypt.compare()` (constant-time).

```ts
import * as bcrypt from 'bcrypt';

// Hash al registrar
const hash = await bcrypt.hash(plainPassword, this.config.bcryptSaltRounds);

// Comparar al login (constant-time, resistente a timing attacks)
const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
```

**Importante en login**: si el usuario no existe, **no** retornes inmediatamente. Ejecuta un `bcrypt.compare` con un hash dummy para que el tiempo de respuesta sea similar al de un email válido. Esto previene enumeración de usuarios por timing.

```ts
async validateCredentials(email: string, password: string): Promise<UserEntity> {
  const user = await this.userRepository.findByEmail(email);
  const dummyHash = '$2b$12$' + 'x'.repeat(53); // hash inválido pero con el formato correcto

  const hashToCompare = user?.passwordHash ?? dummyHash;
  const isValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isValid) {
    throw new InvalidCredentialsException();
  }
  if (!user.active) {
    throw new AccountInactiveException();
  }
  return user;
}
```

---

## 2. JWT: Estrategia Access + Refresh

**Dos tokens**:
- **Access token**: corto (15 minutos). Se envía en `Authorization: Bearer <token>` con cada request. Si se filtra, dura poco.
- **Refresh token**: largo (7 días). Solo se usa para pedir un nuevo access. Se almacena en cookie httpOnly o en la BD.

**Almacenamiento del refresh**:
- **Opción A (recomendada)**: cookie `httpOnly`, `secure`, `sameSite=strict`, path `/v1/auth/refresh`. Inmune a XSS.
- **Opción B**: refresh token guardado hasheado en BD; cliente lo guarda en almacenamiento seguro y lo envía explícitamente. Permite revocación granular.

**Rotación obligatoria**: cada vez que se usa un refresh para obtener un nuevo access, se emite también un nuevo refresh y se invalida el anterior. Si un atacante reusa un refresh ya canjeado, se detecta y se cierra la sesión.

```ts
// auth/entities/refresh-token.entity.ts
@Entity({ name: 'refresh_tokens' })
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 255 })
  tokenHash!: string; // SHA-256 del refresh token (NO el token en plano)

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'replaced_by', type: 'uuid', nullable: true })
  replacedBy!: string | null; // detección de reuse

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
```

**Estructura del payload del access token**:
```ts
interface AccessTokenPayload {
  sub: string;        // user id
  email: string;
  roles: UserRole[];
  iat: number;
  exp: number;
}
```

**Reglas**:
- `sub` es el ID de usuario (estándar JWT).
- **No** incluir información sensible en el payload (es legible por cualquiera con el token).
- Firmar con `HS256` con secreto fuerte (≥ 32 chars aleatorios) o `RS256` con par de claves.
- Secretos `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` **distintos**.

---

## 3. Passport Strategies

Dos strategies: `LocalStrategy` (login con email/password) y `JwtStrategy` (validación de access tokens).

```ts
// auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email', passwordField: 'password' });
  }

  async validate(email: string, password: string): Promise<AuthenticatedUser> {
    return this.authService.validateCredentials(email, password);
  }
}
```

```ts
// auth/strategies/jwt.strategy.ts
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@/config/config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.jwtAccess.secret,
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles,
    };
  }
}
```

---

## 4. Auth Module — Estructura

```
src/modules/auth/
├── application/
│   ├── auth.service.ts
│   └── dto/
│       ├── login.dto.ts
│       ├── register.dto.ts
│       └── token-response.dto.ts
├── domain/
│   ├── entities/
│   │   └── refresh-token.entity.ts
│   └── exceptions/
│       ├── invalid-credentials.exception.ts
│       └── invalid-refresh-token.exception.ts
├── infrastructure/
│   └── http/
│       └── auth.controller.ts
├── strategies/
│   ├── local.strategy.ts
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── local-auth.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── public.decorator.ts
│   └── roles.decorator.ts
└── auth.module.ts
```

---

## 5. Login, Logout, Refresh

```ts
// auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateCredentials(email: string, password: string): Promise<UserEntity> {
    // (Ver sección 1 — con protección anti-timing)
  }

  async login(user: UserEntity): Promise<TokenResponseDto> {
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!stored || stored.expiresAt < new Date()) {
      throw new InvalidRefreshTokenException();
    }

    if (stored.revokedAt) {
      // Reuso detectado: invalidar todas las sesiones de este usuario
      await this.refreshTokenRepository.revokeAllForUser(stored.userId);
      throw new InvalidRefreshTokenException('Reuso detectado, sesión revocada');
    }

    const user = await this.userRepository.findById(stored.userId);
    if (!user || !user.active) throw new InvalidRefreshTokenException();

    // Rotación: revoca el anterior y emite uno nuevo
    const tokens = await this.issueTokens(user);
    await this.refreshTokenRepository.revoke(stored.id, tokens.refreshTokenId);
    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.refreshTokenRepository.findByHash(tokenHash);
    if (stored) await this.refreshTokenRepository.revoke(stored.id, null);
  }

  private async issueTokens(user: UserEntity): Promise<TokenResponseDto> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.jwtAccess.secret,
      expiresIn: this.config.jwtAccess.expiresIn,
    });

    const refreshTokenPlain = randomBytes(64).toString('hex');
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { secret: this.config.jwtRefresh.secret, expiresIn: this.config.jwtRefresh.expiresIn },
    );

    const stored = await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: addDuration(new Date(), this.config.jwtRefresh.expiresIn),
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenId: stored.id,
      expiresIn: parseDuration(this.config.jwtAccess.expiresIn),
    };
  }
}
```

```ts
// auth.controller.ts
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@CurrentUser() user: UserEntity): Promise<TokenResponseDto> {
    return this.authService.login(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto): Promise<TokenResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }
}
```

---

## 6. Guards de Autenticación y Roles

**Convención**: por defecto, todos los endpoints requieren autenticación. Se exceptúan con `@Public()`.

```ts
// public.decorator.ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) { super(); }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

// Registrar como global en AppModule:
{
  provide: APP_GUARD,
  useClass: JwtAuthGuard,
},
```

**Roles**:
```ts
// roles.decorator.ts
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// uso
@Get('admin/stats')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
getStats() { ... }
```

---

## 7. Política de Contraseñas

Mínimos para Valleflor:
- 12 caracteres mínimo (no 8: NIST 2024 recomienda ≥ 12).
- Al menos una mayúscula, una minúscula y un número.
- Caracteres especiales **opcionales** (no bloqueantes; estudios muestran que no aumentan seguridad real cuando ya hay longitud).
- **Máximo 72 caracteres** (límite real de bcrypt).
- Verificar contra lista de contraseñas comunes (usar `zxcvbn` para estimar fortaleza, rechazar si score < 3).
- **No** forzar cambio periódico (NIST lo desaconseja explícitamente; solo cambiar en caso de sospecha de compromiso).
- En reset de contraseña: token de un solo uso, expira en 1 hora, vinculado al `passwordHash` actual (si la contraseña cambia por otra vía, el token deja de ser válido).

---

## 8. OWASP Top 10 Aplicado

| # | Riesgo | Mitigación en Valleflor |
|---|--------|-----------------------|
| A01 | Broken Access Control | Guards globales `JwtAuthGuard`, roles explícitos, verificación de ownership en services (`if (resource.userId !== currentUser.id) throw new ForbiddenException()`). |
| A02 | Cryptographic Failures | Bcrypt 12+, secretos JWT ≥ 32 chars, HTTPS obligatorio en prod, `timestamptz` UTC para tiempos. |
| A03 | Injection | TypeORM con parámetros, validación con class-validator, `whitelist: true` en ValidationPipe descarta props no declaradas. |
| A04 | Insecure Design | Threat modeling al diseñar features sensibles, principio de menor privilegio, denegar por defecto. |
| A05 | Security Misconfiguration | `helmet`, CORS estricto, `synchronize: false`, no exponer stack traces en prod (filter custom), validar env vars al arrancar. |
| A06 | Vulnerable Components | `npm audit` en CI, Dependabot, lock de versiones, eliminar dependencias no usadas. |
| A07 | Identification & Auth Failures | Bcrypt, rate limit en `/login`, anti-timing en validateCredentials, refresh con rotación + detección de reuso, lockout temporal después de N fallos. |
| A08 | Software & Data Integrity Failures | `package-lock.json` commiteado, imágenes Docker pinneadas por hash, firmar releases. |
| A09 | Security Logging Failures | Log de eventos de auth (login OK/fallo, refresh, logout, role changes), correlation ID, retener mínimo 90 días. |
| A10 | SSRF | Validar URLs antes de fetch desde el backend, lista blanca de dominios externos. |

---

## 9. Headers de Seguridad

`helmet` aplica los principales por defecto:

```ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", config.corsOrigin],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
}));
```

---

## 10. Rate Limiting de Endpoints Sensibles

| Endpoint | Límite |
|----------|--------|
| `POST /auth/login` | 5 / minuto / IP |
| `POST /auth/register` | 3 / minuto / IP |
| `POST /auth/forgot-password` | 3 / hora / IP |
| `POST /auth/refresh` | 30 / minuto / IP |
| Resto autenticados | 100 / minuto / usuario |

```ts
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Post('login')
login(...) {}
```

Para producción real, usar `ThrottlerStorageRedisService` para que el límite sea coherente entre instancias.

---

## 11. Logs de Auditoría

Eventos que **siempre** se loggean:
- Login exitoso (`auth.login.success` con userId, IP, userAgent).
- Login fallido (`auth.login.failed` con email intentado, IP, motivo).
- Logout.
- Refresh token usado.
- Refresh token reuso detectado (severity: high).
- Cambio de contraseña.
- Cambio de rol.
- Cambio de email.
- Acceso denegado por roles (`auth.forbidden`).

**Nunca loggear**:
- Contraseñas en plano (ni siquiera en intentos fallidos).
- Tokens completos (sí los últimos 4 chars como referencia).
- Datos personales sensibles (PII) que no sean estrictamente necesarios.

---

## 12. Anti-patrones de Seguridad

- **Secretos hardcodeados** en código (incluso "temporal"). Cero excepciones.
- **`jwt.verify` con secreto vacío** o constante débil.
- **Validar permisos en el frontend solamente**. El frontend solo decide qué mostrar; el backend decide qué se puede hacer.
- **Mensajes de error que filtran información**: "Email no existe" + "Contraseña incorrecta" → unifica a "Credenciales inválidas".
- **Tokens en URLs** (`?token=...`). Quedan en logs, history del browser, referer headers.
- **`localStorage` para tokens en frontend** sin entender el riesgo de XSS. Preferir cookies httpOnly, o memoria + refresh.
- **CORS abierto** (`origin: '*'`) en producción.
- **`synchronize: true`** en TypeORM (puede borrar columnas con datos).
- **Aceptar JWT sin validar `exp`**.
- **No revocar refresh tokens** al cambiar contraseña o detectar compromiso.
- **Comparar contraseñas con `===`**. Usar `bcrypt.compare` siempre.
- **Usar el mismo secreto para access y refresh**.
- **Confiar en `req.body.userId`** para identificar al usuario. Siempre del JWT.

---

## Checklist de Seguridad

- [ ] Bcrypt con salt ≥ 12.
- [ ] DTO de password con `MaxLength(72)`.
- [ ] Validación anti-timing en login.
- [ ] Access token corto (≤ 15 min), refresh largo (≤ 7 días).
- [ ] Refresh token hasheado en BD con detección de reuso.
- [ ] Secretos JWT distintos y ≥ 32 chars.
- [ ] `helmet` y CORS configurados estrictamente.
- [ ] Rate limit en endpoints de auth.
- [ ] `JwtAuthGuard` global con `@Public()` para excepciones.
- [ ] Verificación de ownership en services (no solo guards).
- [ ] Filter de excepciones no expone stack traces en prod.
- [ ] Logs de auditoría implementados.
- [ ] No hay secretos hardcodeados ni en logs.
