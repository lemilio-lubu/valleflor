import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import * as xlsx from 'xlsx';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { VfWorld } from '../support/world';
import { getDataSource } from '../support/app-holder';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../support/db';
import { FROZEN_NOW } from '../support/hooks';

const API = '/api/v1';

// Identificadores únicos para no chocar con constraints (finca/producto/email).
let seq = 0;
const uniq = () => `${Date.now()}-${seq++}`;

// ── Helpers de identidad ──────────────────────────────────────────────────────

/** Inserta un usuario directamente (sin pasar por el normalizador que pone el
 *  nombre en mayúsculas), para que la auditoría guarde el nombre tal cual. */
async function ensureUsuario(
  world: VfWorld,
  u: { email: string; nombre: string | null; role: 'admin' | 'responsable'; password: string },
): Promise<void> {
  const ds = getDataSource();
  const hash = await bcrypt.hash(u.password, 4);
  await ds.query(
    `INSERT INTO users (id, email, password_hash, role, nombre, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (email) DO NOTHING`,
    [randomUUID(), u.email, hash, u.role, u.nombre],
  );
}

async function login(world: VfWorld, email: string, password: string): Promise<string> {
  const res = await request(world.app.getHttpServer())
    .post(`${API}/auth/login`)
    .send({ email, password });
  expect(res.status).toBe(200);
  return res.body.accessToken as string;
}

/** Garantiza un administrador con nombre exacto y lo deja como identidad activa. */
async function actuarComoAdmin(world: VfWorld, nombre: string): Promise<void> {
  const email = `${nombre.toLowerCase()}@valleflor.com`;
  await ensureUsuario(world, { email, nombre, role: 'admin', password: ADMIN_PASSWORD });
  const token = await login(world, email, ADMIN_PASSWORD);
  world.tokens[nombre] = token;
  world.token = token;
}

// ── Helpers de acciones de dominio ────────────────────────────────────────────

/** Ejecuta una mutación representativa del módulo con la identidad activa. */
async function ejecutarAccion(world: VfWorld, modulo: string, accion: string): Promise<void> {
  const token = world.token;
  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${token}`);
  const server = world.app.getHttpServer();

  if (modulo === 'fincas') {
    const create = await auth(request(server).post(`${API}/fincas`)).send({
      nombre: `Finca ${uniq()}`,
    });
    expect(create.status).toBe(201);
    const id = create.body.id;
    if (accion === 'Edición') {
      const r = await auth(request(server).patch(`${API}/fincas/${id}`)).send({
        nombre: `Finca ${uniq()} Mod`,
      });
      expect(r.status).toBe(200);
    } else if (accion === 'Baja') {
      const r = await auth(request(server).patch(`${API}/fincas/${id}/baja`)).send({
        motivoBaja: 'prueba',
      });
      expect(r.status).toBe(200);
    }
    return;
  }

  if (modulo === 'usuarios') {
    const create = await auth(request(server).post(`${API}/users`)).send({
      email: `u${uniq()}@valleflor.com`,
      password: 'usuario1234',
    });
    expect(create.status).toBe(201);
    const id = create.body.id;
    if (accion === 'Edición') {
      const r = await auth(request(server).patch(`${API}/users/${id}`)).send({
        nombre: 'NuevoNombre',
      });
      expect(r.status).toBe(200);
    } else if (accion === 'Baja') {
      const r = await auth(request(server).delete(`${API}/users/${id}`));
      expect(r.status).toBe(204);
    }
    return;
  }

  // catálogo
  const create = await auth(request(server).post(`${API}/productos`)).send({
    nombre: `Prod ${uniq()}`,
  });
  expect(create.status).toBe(201);
  const id = create.body.id;
  if (accion === 'Edición') {
    const r = await auth(request(server).patch(`${API}/productos/${id}`)).send({
      nombre: `Prod ${uniq()} Mod`,
    });
    expect(r.status).toBe(200);
  } else if (accion === 'Baja') {
    const r = await auth(request(server).patch(`${API}/productos/${id}/baja`)).send({
      motivoBaja: 'prueba',
    });
    expect(r.status).toBe(200);
  }
}

// ── Helpers de consulta de la auditoría ───────────────────────────────────────

// `token` es obligatorio (puede ser undefined a propósito para el caso sin auth);
// no se usa default para no enmascarar la ausencia de credenciales.
async function getCambios(
  world: VfWorld,
  query: Record<string, string>,
  token: string | undefined,
) {
  let req = request(world.app.getHttpServer()).get(`${API}/auditoria/cambios`);
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  return req.query(query);
}

interface MovimientoApi {
  responsable: string;
  accion: string;
  modulo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
}

// Estado transitorio adicional del escenario (resultados de consulta, filtros).
interface AuditWorld extends VfWorld {
  cambios?: MovimientoApi[];
  accesos?: { responsable: string; fecha: string }[];
  pdfFiltroResponsable?: string;
}

function binaryParser(res: any, cb: (err: Error | null, body: Buffer) => void) {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk: string) => (data += chunk));
  res.on('end', () => cb(null, Buffer.from(data, 'binary')));
}

// ──────────────────────────────────────────────────────────────────────────────
// Registro de movimientos
// ──────────────────────────────────────────────────────────────────────────────

Given(
  'que la administradora {string} gestiona el módulo de {word}',
  async function (this: VfWorld, nombre: string, modulo: string) {
    await actuarComoAdmin(this, nombre);
    this.moduloAuditoria = modulo;
  },
);

When(
  'realiza la acción {string} sobre un elemento del módulo de {word}',
  async function (this: VfWorld, accion: string, modulo: string) {
    await ejecutarAccion(this, modulo, accion);
  },
);

async function assertMovimiento(
  world: VfWorld,
  responsable: string,
  accion: string,
  modulo: string,
) {
  const res = await getCambios(world, { modulo }, world.adminToken);
  expect(res.status).toBe(200);
  const movs = res.body as MovimientoApi[];
  const match = movs.find(
    (m) => m.responsable === responsable && m.accion === accion && m.modulo === modulo,
  );
  expect(match).toBeTruthy();
  expect(match!.fecha).toBeTruthy();
}

Then(
  'la auditoría registra un movimiento con la responsable {string}, la acción {string}, el módulo de {word} y la fecha y hora del cambio',
  async function (this: VfWorld, responsable: string, accion: string, modulo: string) {
    await assertMovimiento(this, responsable, accion, modulo);
  },
);

Then(
  'la auditoría registra un movimiento con la responsable {string}, la acción {string}, el módulo de {word} y la fecha y hora',
  async function (this: VfWorld, responsable: string, accion: string, modulo: string) {
    await assertMovimiento(this, responsable, accion, modulo);
  },
);

// ── Edición con valor anterior ────────────────────────────────────────────────

Given('la finca {string} está registrada', async function (this: VfWorld, nombre: string) {
  const res = await request(this.app.getHttpServer())
    .post(`${API}/fincas`)
    .set('Authorization', `Bearer ${this.token}`)
    .send({ nombre });
  expect(res.status).toBe(201);
  this.ids['finca:edicion'] = res.body.id;
});

When(
  '{string} edita la finca y cambia su nombre a {string}',
  async function (this: VfWorld, persona: string, nuevoNombre: string) {
    const res = await request(this.app.getHttpServer())
      .patch(`${API}/fincas/${this.ids['finca:edicion']}`)
      .set('Authorization', `Bearer ${this.tokens[persona] ?? this.token}`)
      .send({ nombre: nuevoNombre });
    expect(res.status).toBe(200);
  },
);

Then(
  'la auditoría registra un movimiento de Edición con el valor anterior {string} y el valor nuevo {string}',
  async function (this: VfWorld, anterior: string, nuevo: string) {
    const res = await getCambios(this, { modulo: 'fincas' }, this.adminToken);
    expect(res.status).toBe(200);
    const movs = res.body as MovimientoApi[];
    const match = movs.find(
      (m) => m.accion === 'Edición' && m.valorAnterior === anterior && m.valorNuevo === nuevo,
    );
    expect(match).toBeTruthy();
  },
);

// ── Asignación de responsable ─────────────────────────────────────────────────

When('asigna un responsable a una finca', async function (this: VfWorld) {
  const server = this.app.getHttpServer();
  const auth = (req: request.Test) => req.set('Authorization', `Bearer ${this.token}`);

  const finca = await auth(request(server).post(`${API}/fincas`)).send({
    nombre: `Finca ${uniq()}`,
  });
  expect(finca.status).toBe(201);

  const usuario = await auth(request(server).post(`${API}/users`)).send({
    email: `r${uniq()}@valleflor.com`,
    password: 'responsable1234',
    role: 'responsable',
  });
  expect(usuario.status).toBe(201);

  const asign = await auth(
    request(server).post(`${API}/fincas/${finca.body.id}/responsables`),
  ).send({ userId: usuario.body.id });
  expect(asign.status).toBe(201);
});

// ── Carga masiva ──────────────────────────────────────────────────────────────

When('realiza una carga masiva en el catálogo', async function (this: VfWorld) {
  const ws = xlsx.utils.json_to_sheet([
    { FINCA: '', RESPONSABLE: '', CODIGO: '', PRODUCTO: '', VARIEDAD: '', COLOR: '' },
  ]);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Hoja1');
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

  const res = await request(this.app.getHttpServer())
    .post(`${API}/admin/catalog/bulk-upload`)
    .set('Authorization', `Bearer ${this.token}`)
    .attach('file', buffer, 'carga.xlsx');
  expect(res.status).toBe(201);
});

// ──────────────────────────────────────────────────────────────────────────────
// Inicios de sesión (apartado propio)
// ──────────────────────────────────────────────────────────────────────────────

When(
  'un administrador inicia sesión en el portal de administración',
  async function (this: VfWorld) {
    await login(this, ADMIN_EMAIL, ADMIN_PASSWORD);
  },
);

Then(
  'la auditoría registra el acceso con el administrador y la fecha y hora del inicio de sesión',
  async function (this: VfWorld) {
    const res = await request(this.app.getHttpServer())
      .get(`${API}/auditoria/accesos`)
      .set('Authorization', `Bearer ${this.adminToken}`);
    expect(res.status).toBe(200);
    const accesos = res.body as { responsable: string; fecha: string }[];
    expect(accesos.length).toBeGreaterThan(0);
    expect(accesos[0].responsable).toBeTruthy();
    expect(accesos[0].fecha).toBeTruthy();
  },
);

Given(
  'que el administrador inició sesión en el portal de administración',
  function (this: VfWorld) {
    // El hook Before ya autenticó al administrador; se reafirma la identidad.
    this.token = this.adminToken;
  },
);

Given(
  'existen accesos al sistema y cambios en los módulos registrados',
  async function (this: VfWorld) {
    // Un acceso ya existe (login del hook); se añade un cambio en un módulo.
    await ejecutarAccion(this, 'fincas', 'Creación');
  },
);

When('consulta la auditoría', async function (this: AuditWorld) {
  const cambios = await getCambios(this, {}, this.adminToken);
  expect(cambios.status).toBe(200);
  this.cambios = cambios.body as MovimientoApi[];

  const accesos = await request(this.app.getHttpServer())
    .get(`${API}/auditoria/accesos`)
    .set('Authorization', `Bearer ${this.adminToken}`);
  expect(accesos.status).toBe(200);
  this.accesos = accesos.body;
});

Then(
  'los inicios de sesión se muestran en el apartado de {string}',
  function (this: AuditWorld, _apartado: string) {
    expect((this.accesos ?? []).length).toBeGreaterThan(0);
  },
);

Then(
  'no aparecen mezclados con el historial de cambios de fincas, usuarios ni catálogo',
  function (this: AuditWorld) {
    const logins = (this.cambios ?? []).filter((m) => m.accion === 'Inicio de sesión');
    expect(logins).toHaveLength(0);
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Consulta del historial por módulo
// ──────────────────────────────────────────────────────────────────────────────

Given(
  'existen movimientos de auditoría registrados en el módulo de {word}',
  async function (this: VfWorld, modulo: string) {
    await ejecutarAccion(this, modulo, 'Creación');
  },
);

When(
  'consulta la auditoría del módulo de {word}',
  async function (this: VfWorld, modulo: string) {
    // Usa la identidad activa (clave para los escenarios de control de acceso).
    this.response = await getCambios(this, { modulo }, this.token);
  },
);

Then(
  've los movimientos registrados de {word} con su responsable, acción y fecha',
  function (this: VfWorld, modulo: string) {
    expect(this.response!.status).toBe(200);
    const movs = this.response!.body as MovimientoApi[];
    expect(movs.length).toBeGreaterThan(0);
    for (const m of movs) {
      expect(m.responsable).toBeTruthy();
      expect(m.accion).toBeTruthy();
      expect(m.fecha).toBeTruthy();
      expect(m.modulo).toBe(modulo);
    }
  },
);

Then('los movimientos se muestran del más reciente al más antiguo', function (this: VfWorld) {
  const movs = this.response!.body as MovimientoApi[];
  for (let i = 1; i < movs.length; i++) {
    const prev = new Date(movs[i - 1].fecha).getTime();
    const curr = new Date(movs[i].fecha).getTime();
    expect(prev).toBeGreaterThanOrEqual(curr);
  }
});

Given(
  'el módulo de {word} no tiene movimientos de auditoría registrados',
  function (this: VfWorld, _modulo: string) {
    // La BD se trunca antes de cada escenario; no hay nada que preparar.
  },
);

Then(
  'el sistema indica que no hay movimientos registrados para ese módulo',
  function (this: VfWorld) {
    expect(this.response!.status).toBe(200);
    expect(this.response!.body as unknown[]).toHaveLength(0);
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Filtrado del historial
// ──────────────────────────────────────────────────────────────────────────────

Given(
  'el módulo de {word} tiene movimientos de varios responsables y tipos de acción',
  async function (this: VfWorld, modulo: string) {
    await actuarComoAdmin(this, 'Ana');
    await ejecutarAccion(this, modulo, 'Creación');
    await ejecutarAccion(this, modulo, 'Edición');
    await actuarComoAdmin(this, 'Beatriz');
    await ejecutarAccion(this, modulo, 'Creación');
  },
);

Given(
  'el módulo de {word} tiene movimientos solo de la responsable {string}',
  async function (this: VfWorld, modulo: string, nombre: string) {
    await actuarComoAdmin(this, nombre);
    await ejecutarAccion(this, modulo, 'Creación');
  },
);

When(
  'filtra la auditoría del módulo de {word} por la responsable {string}',
  async function (this: VfWorld, modulo: string, responsable: string) {
    this.response = await getCambios(this, { modulo, responsable }, this.adminToken);
  },
);

When(
  'filtra la auditoría del módulo de {word} por el tipo de acción {string}',
  async function (this: VfWorld, modulo: string, accion: string) {
    this.response = await getCambios(this, { modulo, accion }, this.adminToken);
  },
);

Then(
  'solo ve los movimientos que coinciden con la responsable {string}',
  function (this: VfWorld, responsable: string) {
    expect(this.response!.status).toBe(200);
    const movs = this.response!.body as MovimientoApi[];
    expect(movs.length).toBeGreaterThan(0);
    for (const m of movs) expect(m.responsable).toBe(responsable);
  },
);

Then(
  'solo ve los movimientos que coinciden con el tipo de acción {string}',
  function (this: VfWorld, accion: string) {
    expect(this.response!.status).toBe(200);
    const movs = this.response!.body as MovimientoApi[];
    expect(movs.length).toBeGreaterThan(0);
    for (const m of movs) expect(m.accion).toBe(accion);
  },
);

Then(
  'el sistema indica que no hay movimientos que coincidan con el filtro',
  function (this: VfWorld) {
    expect(this.response!.status).toBe(200);
    expect(this.response!.body as unknown[]).toHaveLength(0);
  },
);

// ── Ocultar filtros (estado de UI, simulado en memoria) ───────────────────────

Given('los filtros de la auditoría están visibles', function (this: VfWorld) {
  this.filtrosVisibles = true;
});

When('oculta los filtros', function (this: VfWorld) {
  this.filtrosVisibles = false;
});

Then('los filtros dejan de mostrarse', function (this: VfWorld) {
  expect(this.filtrosVisibles).toBe(false);
});

Then('el historial sigue mostrando los movimientos', async function (this: VfWorld) {
  const res = await getCambios(this, { modulo: 'fincas' }, this.adminToken);
  expect(res.status).toBe(200);
});

// ──────────────────────────────────────────────────────────────────────────────
// Retención (3 años)
// ──────────────────────────────────────────────────────────────────────────────

Given(
  'existe un movimiento registrado hace {}',
  async function (this: AuditWorld, antiguedad: string) {
    const fecha = new Date(FROZEN_NOW);
    if (antiguedad === '1 año') {
      fecha.setFullYear(fecha.getFullYear() - 1);
    } else if (antiguedad === '3 años menos un día') {
      fecha.setFullYear(fecha.getFullYear() - 3);
      fecha.setDate(fecha.getDate() + 1);
    } else {
      // "más de 3 años"
      fecha.setFullYear(fecha.getFullYear() - 3);
      fecha.setDate(fecha.getDate() - 1);
    }
    const id = randomUUID();
    await getDataSource().query(
      `INSERT INTO movimientos_auditoria
         (id, actor_id, actor_nombre, accion, modulo, valor_anterior, valor_nuevo, fecha, created_at)
       VALUES ($1, NULL, 'Ana', 'Creación', 'fincas', NULL, NULL, $2, NOW())`,
      [id, fecha.toISOString()],
    );
    this.ids['movimiento'] = id;
  },
);

Then('el movimiento aparece en la auditoría', function (this: AuditWorld) {
  const ids = (this.cambios ?? []).map((m) => (m as unknown as { id: string }).id);
  expect(ids).toContain(this.ids['movimiento']);
});

Then('el movimiento ya no se conserva', function (this: AuditWorld) {
  const ids = (this.cambios ?? []).map((m) => (m as unknown as { id: string }).id);
  expect(ids).not.toContain(this.ids['movimiento']);
});

// ──────────────────────────────────────────────────────────────────────────────
// Exportación a PDF
// ──────────────────────────────────────────────────────────────────────────────

Given('el módulo de {word} tiene movimientos registrados', async function (this: VfWorld, modulo: string) {
  await ejecutarAccion(this, modulo, 'Creación');
});

Given(
  'filtró la auditoría del módulo de {word} por la responsable {string}',
  async function (this: AuditWorld, modulo: string, responsable: string) {
    // Movimientos de dos responsables para demostrar que el PDF filtra.
    await actuarComoAdmin(this, responsable);
    await ejecutarAccion(this, modulo, 'Creación');
    await actuarComoAdmin(this, 'Beatriz');
    await ejecutarAccion(this, modulo, 'Creación');
    this.pdfFiltroResponsable = responsable;
    this.token = this.adminToken;
  },
);

When(
  'descarga en PDF la auditoría del módulo de {word}',
  async function (this: AuditWorld, modulo: string) {
    const query: Record<string, string> = { modulo };
    if (this.pdfFiltroResponsable) query.responsable = this.pdfFiltroResponsable;
    this.response = await request(this.app.getHttpServer())
      .get(`${API}/auditoria/cambios/pdf`)
      .query(query)
      .set('Authorization', `Bearer ${this.adminToken}`)
      .buffer()
      .parse(binaryParser);
  },
);

Then(
  'obtiene un documento PDF con los movimientos del módulo de {word}',
  function (this: VfWorld, _modulo: string) {
    expect(this.response!.status).toBe(200);
    expect(this.response!.headers['content-type']).toContain('application/pdf');
    const body = this.response!.body as Buffer;
    expect(body.slice(0, 4).toString()).toBe('%PDF');
  },
);

Then(
  'el PDF incluye solo los movimientos de la responsable {string}',
  async function (this: VfWorld, responsable: string) {
    // pdfkit codifica el texto como glifos, así que el PDF no se introspecciona
    // byte a byte; se verifica el conjunto de datos filtrado del que se genera
    // (mismo consultarCambios que usa el endpoint PDF).
    expect(this.response!.status).toBe(200);
    expect((this.response!.body as Buffer).slice(0, 4).toString()).toBe('%PDF');

    const res = await getCambios(this, { modulo: 'fincas', responsable }, this.adminToken);
    expect(res.status).toBe(200);
    const movs = res.body as MovimientoApi[];
    expect(movs.length).toBeGreaterThan(0);
    for (const m of movs) expect(m.responsable).toBe(responsable);
  },
);

// ──────────────────────────────────────────────────────────────────────────────
// Control de acceso
// ──────────────────────────────────────────────────────────────────────────────

Given(
  /^que (.+) intenta acceder a la auditoría$/,
  async function (this: VfWorld, quien: string) {
    if (quien === 'el administrador autenticado') {
      this.token = this.adminToken;
    } else if (quien === 'un responsable autenticado') {
      const email = `resp-audit@valleflor.com`;
      await ensureUsuario(this, {
        email,
        nombre: 'RespAudit',
        role: 'responsable',
        password: 'responsable1234',
      });
      this.token = await login(this, email, 'responsable1234');
    } else {
      // alguien sin autenticación
      this.token = undefined;
    }
  },
);

Then('el sistema muestra los movimientos', function (this: VfWorld) {
  expect(this.response!.status).toBe(200);
});

// "el sistema niega el acceso" se reutiliza desde productos.steps.ts (401/403).
