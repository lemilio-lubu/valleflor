import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';
import { tokenDe } from './auth.steps';

interface PlantillaRow {
  registroId: string;
  dia: string;
  colorId: string;
}

// Obtiene (y cachea) el id del registro de un día concreto de la semana de la
// persona (cada responsable tiene su propia semana → ids[`semana:<persona>`]).
async function registroIdPorDia(
  world: VfWorld,
  persona: string,
  dia: string,
): Promise<string> {
  const diaEnum = dia.toUpperCase();
  const semanaId = world.ids[`semana:${persona}`] ?? world.ids['semana'];
  const cacheKey = `registro:${persona}:${diaEnum}`;
  if (world.ids[cacheKey]) return world.ids[cacheKey];

  const res = await request(world.app.getHttpServer())
    .get(`/api/v1/semanas/${semanaId}/plantilla`)
    .set('Authorization', `Bearer ${world.adminToken}`);
  expect(res.status).toBe(200);
  const row = (res.body as PlantillaRow[]).find((r) => r.dia === diaEnum);
  expect(row).toBeTruthy();
  world.ids[cacheKey] = row!.registroId;
  return row!.registroId;
}

async function registrarCajas(
  world: VfWorld,
  persona: string,
  cajas: number,
  dia: string,
): Promise<void> {
  const id = await registroIdPorDia(world, persona, dia);
  world.response = await request(world.app.getHttpServer())
    .patch(`/api/v1/registros/${id}`)
    .set('Authorization', `Bearer ${tokenDe(world, persona)}`)
    .send({ cajas });
}

When(
  '{word} registra {float} cajas el {word}',
  async function (this: VfWorld, persona: string, cajas: number, dia: string) {
    await registrarCajas(this, persona, cajas, dia);
  },
);

Given(
  'que {word} ha registrado {float} cajas el {word}',
  async function (this: VfWorld, persona: string, cajas: number, dia: string) {
    await registrarCajas(this, persona, cajas, dia);
    expect(this.response!.status).toBe(200);
  },
);

Given(
  'que {word} ha registrado {float} cajas cada día de lunes a viernes',
  async function (this: VfWorld, persona: string, cajas: number) {
    for (const dia of ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']) {
      await registrarCajas(this, persona, cajas, dia);
      expect(this.response!.status).toBe(200);
    }
  },
);

When(
  '{word} ajusta el divisor del registro del {word} a {int}',
  async function (this: VfWorld, persona: string, dia: string, divisor: number) {
    const id = await registroIdPorDia(this, persona, dia);
    this.response = await request(this.app.getHttpServer())
      .patch(`/api/v1/registros/${id}/divisor`)
      .set('Authorization', `Bearer ${tokenDe(this, persona)}`)
      .send({ divisorTallos: divisor });
  },
);

When(
  '{word} registra en lote {float} cajas el {word} y {float} cajas el {word}',
  async function (
    this: VfWorld,
    persona: string,
    cajas1: number,
    dia1: string,
    cajas2: number,
    dia2: string,
  ) {
    const id1 = await registroIdPorDia(this, persona, dia1);
    const id2 = await registroIdPorDia(this, persona, dia2);
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/registros/bulk-update')
      .set('Authorization', `Bearer ${tokenDe(this, persona)}`)
      .send({
        updates: [
          { id: id1, cajas: cajas1 },
          { id: id2, cajas: cajas2 },
        ],
      });
  },
);

Then(
  'el registro del {word} refleja {float} cajas y {float} tallos',
  function (this: VfWorld, _dia: string, cajas: number, tallos: number) {
    expect(this.response!.status).toBe(200);
    const data = this.response!.body.data;
    expect(Number(data.cajas)).toBe(cajas);
    expect(Number(data.tallos)).toBe(tallos);
  },
);

Then(
  'el sistema acepta el registro con una advertencia',
  function (this: VfWorld) {
    expect(this.response!.status).toBe(200);
    expect(this.response!.body.warning).toBeTruthy();
  },
);

Then(
  'el registro recalculado refleja {float} tallos con divisor {int}',
  function (this: VfWorld, tallos: number, divisor: number) {
    expect(this.response!.status).toBe(200);
    expect(Number(this.response!.body.tallos)).toBe(tallos);
    expect(Number(this.response!.body.divisorTallos)).toBe(divisor);
  },
);

Then(
  'la plantilla muestra el registro del {word} con {float} tallos y divisor {int}',
  async function (this: VfWorld, dia: string, tallos: number, divisor: number) {
    const diaEnum = dia.toUpperCase();
    const res = await request(this.app.getHttpServer())
      .get(`/api/v1/semanas/${this.ids['semana']}/plantilla`)
      .set('Authorization', `Bearer ${this.adminToken}`);
    expect(res.status).toBe(200);
    const row = (res.body as PlantillaRow[]).find((r) => r.dia === diaEnum) as
      | (PlantillaRow & { tallos: number; divisorTallos: number })
      | undefined;
    expect(row).toBeTruthy();
    expect(Number(row!.tallos)).toBe(tallos);
    expect(Number(row!.divisorTallos)).toBe(divisor);
  },
);

Then(
  'el lote refleja {float} y {float} tallos respectivamente',
  function (this: VfWorld, tallos1: number, tallos2: number) {
    expect(this.response!.status).toBe(201);
    const results = this.response!.body as Array<{ data: { tallos: number } }>;
    expect(Number(results[0].data.tallos)).toBe(tallos1);
    expect(Number(results[1].data.tallos)).toBe(tallos2);
  },
);

// ── recalcular-todos ──────────────────────────────────────────────────────────

When(
  'el administrador recalcula todos los registros',
  async function (this: VfWorld) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/registros/recalcular-todos')
      .set('Authorization', `Bearer ${this.adminToken}`);
  },
);

Then(
  'el recálculo reporta {int} registros actualizados',
  function (this: VfWorld, cantidad: number) {
    expect(this.response!.status).toBe(201);
    expect(this.response!.body.actualizados).toBe(cantidad);
  },
);

// ── cambio de configuración del ítem (tallosPorCaja vive en el color) ──────────

When(
  'el administrador cambia los tallos por caja del ítem a {int}',
  async function (this: VfWorld, tallosPorCaja: number) {
    this.response = await request(this.app.getHttpServer())
      .patch(`/api/v1/colores/${this.ids.color}`)
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ tallosPorCaja });
    expect(this.response.status).toBe(200);
  },
);

// ── validación negativa de DTOs ───────────────────────────────────────────────

When(
  '{word} intenta registrar {int} cajas el {word}',
  async function (this: VfWorld, persona: string, cajas: number, dia: string) {
    await registrarCajas(this, persona, cajas, dia);
  },
);

When(
  '{word} intenta ajustar el divisor del registro del {word} a {int}',
  async function (this: VfWorld, persona: string, dia: string, divisor: number) {
    const id = await registroIdPorDia(this, persona, dia);
    this.response = await request(this.app.getHttpServer())
      .patch(`/api/v1/registros/${id}/divisor`)
      .set('Authorization', `Bearer ${tokenDe(this, persona)}`)
      .send({ divisorTallos: divisor });
  },
);

Then(
  'el sistema rechaza la operación por datos inválidos',
  function (this: VfWorld) {
    expect(this.response!.status).toBe(400);
  },
);
