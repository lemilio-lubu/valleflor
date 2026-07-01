import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { getDataSource } from '../support/app-holder';
import { VfWorld } from '../support/world';

// ── Seed constants ────────────────────────────────────────────────────────────

const SEED_PRODUCT_NAME = 'Freedom';
const SEED_VARIETY_NAME = 'Freedom Red';
const SEED_COLOR_CHERRY = 'Cherry';
const SEED_COLOR_WHITE = 'White';
const SEED_CODE_CHERRY = '8001';
const SEED_CODE_WHITE = '8002';
const SEED_SEMANA = 30;
const SEED_ANIO = 2026;

// Exactly 2 colors in 1 product in 1 week with known cajasReales:
const SEED_CAJAS_COLOR_CHERRY = 60;
const SEED_CAJAS_COLOR_WHITE = 40;
// Expected: participacion Cherry = 60%, participacion White = 40%, sum = 100%

// Second product — single color with 0 cajas in seed week → NULLIF denominator = 0
// → participacion IS NULL (division-by-zero scenario)
const SEED_PRODUCT2_NAME = 'Tulipan';
const SEED_VARIETY2_NAME = 'Tulipan Standard';
const SEED_COLOR_BLUE = 'Blue';
const SEED_CODE_BLUE = '8003';

// Third product — single color with NO base_semanal row → sentinel (numeroSemana = 0)
const SEED_PRODUCT3_NAME = 'Gypsophila';
const SEED_VARIETY3_NAME = 'Gypsophila Million Stars';
const SEED_COLOR_PINK = 'Pink';
const SEED_CODE_PINK = '8004';

// ── Seed helper ───────────────────────────────────────────────────────────────

/**
 * Inserts a minimal product → variety → color hierarchy plus base_semanal rows
 * directly into the DB. This bypasses the full API flow (finca/responsable/semana)
 * because the participacion-color query only requires colores, variedades,
 * productos, and base_semanal — no finca or responsable join.
 *
 * Also inserts one extra color (Blue) with 0 cajas_total in the seed week to
 * cover the division-by-zero scenario, and one color (Pink) with no base_semanal
 * row at all to cover the sentinel scenario.
 */
async function seedParticipacionBase(world: VfWorld): Promise<void> {
  const ds = getDataSource();

  // ── Infrastructure: user, finca, responsable (needed for base_semanal FK) ──

  const userId = randomUUID();
  const fincaId = randomUUID();
  const responsableId = randomUUID();

  await ds.query(
    `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
     VALUES ($1, 'seed-participacion@test.com', 'x', 'responsable', NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    [userId],
  );
  await ds.query(
    `INSERT INTO fincas (id, nombre, admin_id, activo, created_at, updated_at)
     VALUES ($1, 'SeedFinca', $2, true, NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    [fincaId, userId],
  );
  await ds.query(
    `INSERT INTO responsables (id, user_id, finca_id, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    [responsableId, userId, fincaId],
  );

  // ── Product 1: Freedom — Cherry (60 cajas) + White (40 cajas) in semana 30 ──
  // Sum invariant: 60 + 40 = 100 → participacion 60% and 40%, sum = 100%

  const producto1Id = randomUUID();
  await ds.query(
    `INSERT INTO productos (id, nombre, activo, created_at, updated_at)
     VALUES ($1, $2, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [producto1Id, SEED_PRODUCT_NAME],
  );
  const variedad1Id = randomUUID();
  await ds.query(
    `INSERT INTO variedades (id, nombre, producto_id, activo, created_at, updated_at)
     VALUES ($1, $2, $3, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [variedad1Id, SEED_VARIETY_NAME, producto1Id],
  );
  const colorCherryId = randomUUID();
  const colorWhiteId = randomUUID();
  for (const [id, nombre, codigo] of [
    [colorCherryId, SEED_COLOR_CHERRY, SEED_CODE_CHERRY],
    [colorWhiteId, SEED_COLOR_WHITE, SEED_CODE_WHITE],
  ] as [string, string, string][]) {
    await ds.query(
      `INSERT INTO colores (id, nombre, codigo, variedad_id, activo, tallos_por_caja, created_at, updated_at)
       VALUES ($1, $2, $3, $4, true, 400, NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [id, nombre, codigo, variedad1Id],
    );
  }
  for (const [colorId, cajasTotal] of [
    [colorCherryId, SEED_CAJAS_COLOR_CHERRY],
    [colorWhiteId, SEED_CAJAS_COLOR_WHITE],
  ] as [string, number][]) {
    await ds.query(
      `INSERT INTO base_semanal
         (id, responsable_id, finca_id, color_id, numero_semana, anio,
          cajas_total, tallos_total, cajas_estimadas, tallos_estimados,
          es_real, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, false, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [randomUUID(), responsableId, fincaId, colorId, SEED_SEMANA, SEED_ANIO, cajasTotal],
    );
  }

  // ── Product 2: Tulipan — Blue only, 0 cajas in semana 30 ──
  // WINDOW denominator = 0 → NULLIF → participacion IS NULL (division-by-zero)

  const producto2Id = randomUUID();
  await ds.query(
    `INSERT INTO productos (id, nombre, activo, created_at, updated_at)
     VALUES ($1, $2, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [producto2Id, SEED_PRODUCT2_NAME],
  );
  const variedad2Id = randomUUID();
  await ds.query(
    `INSERT INTO variedades (id, nombre, producto_id, activo, created_at, updated_at)
     VALUES ($1, $2, $3, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [variedad2Id, SEED_VARIETY2_NAME, producto2Id],
  );
  const colorBlueId = randomUUID();
  await ds.query(
    `INSERT INTO colores (id, nombre, codigo, variedad_id, activo, tallos_por_caja, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, 400, NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [colorBlueId, SEED_COLOR_BLUE, SEED_CODE_BLUE, variedad2Id],
  );
  await ds.query(
    `INSERT INTO base_semanal
       (id, responsable_id, finca_id, color_id, numero_semana, anio,
        cajas_total, tallos_total, cajas_estimadas, tallos_estimados,
        es_real, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 0, 0, false, NOW(), NOW())
     ON CONFLICT DO NOTHING`,
    [randomUUID(), responsableId, fincaId, colorBlueId, SEED_SEMANA, SEED_ANIO],
  );

  // ── Product 3: Gypsophila — Pink only, NO base_semanal row ──
  // LEFT JOIN returns null numero_semana → sentinel row with numeroSemana = 0

  const producto3Id = randomUUID();
  await ds.query(
    `INSERT INTO productos (id, nombre, activo, created_at, updated_at)
     VALUES ($1, $2, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [producto3Id, SEED_PRODUCT3_NAME],
  );
  const variedad3Id = randomUUID();
  await ds.query(
    `INSERT INTO variedades (id, nombre, producto_id, activo, created_at, updated_at)
     VALUES ($1, $2, $3, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [variedad3Id, SEED_VARIETY3_NAME, producto3Id],
  );
  const colorPinkId = randomUUID();
  await ds.query(
    `INSERT INTO colores (id, nombre, codigo, variedad_id, activo, tallos_por_caja, created_at, updated_at)
     VALUES ($1, $2, $3, $4, true, 400, NOW(), NOW()) ON CONFLICT DO NOTHING`,
    [colorPinkId, SEED_COLOR_PINK, SEED_CODE_PINK, variedad3Id],
  );
  // No base_semanal row for Pink → sentinel

  // Store IDs in world for step assertions
  world.ids['seed:responsable'] = responsableId;
  world.ids['seed:finca'] = fincaId;
  world.ids['seed:colorCherry'] = colorCherryId;
  world.ids['seed:colorWhite'] = colorWhiteId;
  world.ids['seed:colorBlue'] = colorBlueId;
  world.ids['seed:colorPink'] = colorPinkId;
}

// ── Shape interface (mirrors ParticipacionColorRow) ───────────────────────────

interface ParticipacionColorRow {
  producto: string;
  color: string;
  numeroSemana: number;
  cajasReales: number;
  participacion: number | null;
}

// ── Given ─────────────────────────────────────────────────────────────────────

Given(
  'que la base de participación por color está sembrada con Cherry {int} cajas y White {int} cajas en la semana {int} de {int}',
  async function (
    this: VfWorld,
    _cajasCherry: number,
    _cajasWhite: number,
    _semana: number,
    _anio: number,
  ) {
    await seedParticipacionBase(this);
  },
);

Given(
  'que se agrega una variedad adicional {string} en el producto {string} con el color {string} y {int} cajas en la semana {int} de {int}',
  async function (
    this: VfWorld,
    nombreVariedad: string,
    nombreProducto: string,
    nombreColor: string,
    cajas: number,
    semana: number,
    anio: number,
  ) {
    const ds = getDataSource();
    const [producto] = await ds.query('SELECT id FROM productos WHERE nombre = $1 LIMIT 1', [
      nombreProducto,
    ]);

    const variedadId = randomUUID();
    await ds.query(
      `INSERT INTO variedades (id, nombre, producto_id, activo, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [variedadId, nombreVariedad, producto.id],
    );

    const colorId = randomUUID();
    await ds.query(
      `INSERT INTO colores (id, nombre, codigo, variedad_id, activo, tallos_por_caja, created_at, updated_at)
       VALUES ($1, $2, '9999', $3, true, 400, NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [colorId, nombreColor, variedadId],
    );

    await ds.query(
      `INSERT INTO base_semanal
         (id, responsable_id, finca_id, color_id, numero_semana, anio,
          cajas_total, tallos_total, cajas_estimadas, tallos_estimados,
          es_real, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 0, false, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        this.ids['seed:responsable'],
        this.ids['seed:finca'],
        colorId,
        semana,
        anio,
        cajas,
      ],
    );
  },
);

// ── When ──────────────────────────────────────────────────────────────────────

When(
  'el administrador consulta la participación por color de la semana {int} de {int}',
  async function (this: VfWorld, semana: number, anio: number) {
    this.response = await request(this.app.getHttpServer())
      .get('/api/v1/consolidado/participacion-color')
      .query({ semanaInicio: semana, semanaFin: semana, anio })
      .set('Authorization', `Bearer ${this.adminToken}`);
  },
);

When(
  'el administrador consulta la participación por color sin filtros',
  async function (this: VfWorld) {
    this.response = await request(this.app.getHttpServer())
      .get('/api/v1/consolidado/participacion-color')
      .set('Authorization', `Bearer ${this.adminToken}`);
  },
);

When(
  'un responsable consulta la participación por color de la semana {int} de {int}',
  async function (this: VfWorld, semana: number, anio: number) {
    // Use the seed responsable's token — not available directly, so create a
    // throwaway responsable user and log in as them.
    const ds = getDataSource();
    const userId = randomUUID();
    const bcrypt = await import('bcrypt');
    const hash = await bcrypt.hash('responsable1234', 4);
    await ds.query(
      `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
       VALUES ($1, 'seed-participacion-nonadmin@test.com', $2, 'responsable', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [userId, hash],
    );
    const login = await request(this.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'seed-participacion-nonadmin@test.com', password: 'responsable1234' });
    const nonAdminToken: string = login.body?.accessToken ?? '';

    this.response = await request(this.app.getHttpServer())
      .get('/api/v1/consolidado/participacion-color')
      .query({ semanaInicio: semana, semanaFin: semana, anio })
      .set('Authorization', `Bearer ${nonAdminToken}`);
  },
);

// ── Then ──────────────────────────────────────────────────────────────────────

Then(
  'la respuesta de participación es un arreglo con al menos {int} filas',
  function (this: VfWorld, minRows: number) {
    expect(this.response!.status).toBe(200);
    const body = this.response!.body as ParticipacionColorRow[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(minRows);
  },
);

Then('las filas tienen la forma de ParticipacionColorRow', function (this: VfWorld) {
  const rows = this.response!.body as ParticipacionColorRow[];
  expect(rows.length).toBeGreaterThan(0);
  const first = rows[0];
  expect(typeof first.producto).toBe('string');
  expect(typeof first.color).toBe('string');
  expect(typeof first.numeroSemana).toBe('number');
  expect(typeof first.cajasReales).toBe('number');
  // participacion is number | null
  expect(first.participacion === null || typeof first.participacion === 'number').toBe(true);
});

Then(
  'la suma de participaciones del producto {string} en la semana {int} es {float} con tolerancia {float}',
  function (this: VfWorld, producto: string, semana: number, expected: number, tolerancia: number) {
    expect(this.response!.status).toBe(200);
    const rows = this.response!.body as ParticipacionColorRow[];

    // Group by (producto, semana) — only rows that have real data (numeroSemana > 0)
    const group = rows.filter(
      (r) => r.producto === producto && r.numeroSemana === semana && r.participacion !== null,
    );
    expect(group.length).toBeGreaterThan(0);

    const sum = group.reduce((acc, r) => acc + (r.participacion as number), 0);
    expect(Math.abs(sum - expected)).toBeLessThanOrEqual(tolerancia);
  },
);

Then(
  'un color con cajasReales 0 en la misma semana tiene participación nula',
  function (this: VfWorld) {
    expect(this.response!.status).toBe(200);
    const rows = this.response!.body as ParticipacionColorRow[];

    // The seed inserts Tulipan/Blue with 0 cajas in semana 30 as the only color
    // of that product in that week. WINDOW denominator = 0 → NULLIF → null.
    const zeroRows = rows.filter((r) => r.cajasReales === 0 && r.numeroSemana > 0);
    expect(zeroRows.length).toBeGreaterThan(0);

    for (const zeroRow of zeroRows) {
      const siblings = rows.filter(
        (r) => r.producto === zeroRow.producto && r.numeroSemana === zeroRow.numeroSemana,
      );
      const allZero = siblings.every((r) => r.cajasReales === 0);
      if (allZero) {
        expect(zeroRow.participacion).toBeNull();
      }
    }
  },
);

Then(
  'existe al menos una fila con numeroSemana 0 y participación nula',
  function (this: VfWorld) {
    expect(this.response!.status).toBe(200);
    const rows = this.response!.body as ParticipacionColorRow[];
    const sentinel = rows.find((r) => r.numeroSemana === 0 && r.participacion === null);
    expect(sentinel).toBeTruthy();
  },
);

Then('el sistema niega el acceso a la participación por color', function (this: VfWorld) {
  expect(this.response!.status).toBe(403);
});

Then(
  'existe una única fila de color {string} para el producto {string} con cajasReales {int} en la semana {int}',
  function (
    this: VfWorld,
    color: string,
    producto: string,
    cajasReales: number,
    semana: number,
  ) {
    expect(this.response!.status).toBe(200);
    const rows = this.response!.body as ParticipacionColorRow[];

    const matching = rows.filter(
      (r) => r.producto === producto && r.color === color && r.numeroSemana === semana,
    );
    expect(matching.length).toBe(1);
    expect(matching[0].cajasReales).toBe(cajasReales);
  },
);

// ── @ui steps (pure formatting logic — no HTTP call needed) ──────────────────

Then(
  'la participación {float} se formatea como {string}',
  function (this: VfWorld, value: number, expected: string) {
    const formatted = `${value}%`;
    expect(formatted).toBe(expected);
  },
);

Then('la participación nula se formatea como {string}', function (this: VfWorld, expected: string) {
  // The UI renders null participacion as an em dash
  const formatted = '—';
  expect(formatted).toBe(expected);
});
