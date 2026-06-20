import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';
import { tokenDe } from './auth.steps';
import { getCurrentISOWeek } from '../../src/common/iso-week.util';

// ── Setup productivo compartido (reutilizado por registros/base-semanal/consolidado) ──

// Asocia el color del ítem de catálogo (creado por catalogo.steps) al
// responsable indicado. La asignación la realiza el administrador.
Given(
  '{word} tiene asignado el color del ítem',
  async function (this: VfWorld, persona: string) {
    const fincaId = this.ids[`fincaDe:${persona}`];
    const responsableId = this.ids[`responsable:${persona}`];
    const res = await request(this.app.getHttpServer())
      .post(`/api/v1/fincas/${fincaId}/responsables/${responsableId}/productos`)
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ colorIds: [this.ids.color] });
    expect(res.status).toBe(201);
  },
);

// Crea una semana como la persona indicada (debe haber iniciado sesión). Al
// crearse se generan 7 registros diarios por cada color asignado.
async function crearSemana(
  world: VfWorld,
  persona: string,
  numeroSemana: number,
  anio: number,
): Promise<void> {
  world.response = await request(world.app.getHttpServer())
    .post('/api/v1/semanas')
    .set('Authorization', `Bearer ${tokenDe(world, persona)}`)
    .send({
      numeroSemana,
      anio,
      fechaInicio: `${anio}-06-01`,
      fechaFin: `${anio}-06-07`,
    });
  if (world.response.status === 201) {
    world.ids['semana'] = world.response.body.id;
    world.ids[`semana:${persona}`] = world.response.body.id;
    world.ids[`semana:${numeroSemana}-${anio}`] = world.response.body.id;
    world.ids['semana:numero'] = String(numeroSemana);
    world.ids['semana:anio'] = String(anio);
  }
}

Given(
  'que {word} ha creado la semana {int} de {int}',
  async function (this: VfWorld, persona: string, numeroSemana: number, anio: number) {
    await crearSemana(this, persona, numeroSemana, anio);
    expect(this.response!.status).toBe(201);
  },
);

When(
  '{word} crea la semana {int} de {int}',
  async function (this: VfWorld, persona: string, numeroSemana: number, anio: number) {
    await crearSemana(this, persona, numeroSemana, anio);
  },
);

// Variante "semana actual": calcula la semana ISO real para que la base semanal
// la marque como real (esReal) y aparezca en /base-semanal/semana-actual.
Given(
  'que {word} ha creado la semana actual',
  async function (this: VfWorld, persona: string) {
    const { numeroSemana, anio } = getCurrentISOWeek();
    await crearSemana(this, persona, numeroSemana, anio);
    expect(this.response!.status).toBe(201);
  },
);

// ── Escenarios propios de la gestión de semanas ──

When(
  'el administrador intenta crear la semana {int} de {int}',
  async function (this: VfWorld, numeroSemana: number, anio: number) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/semanas')
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({
        numeroSemana,
        anio,
        fechaInicio: `${anio}-06-01`,
        fechaFin: `${anio}-06-07`,
      });
  },
);

When('{word} elimina la semana', async function (this: VfWorld, persona: string) {
  this.response = await request(this.app.getHttpServer())
    .delete(`/api/v1/semanas/${this.ids['semana']}`)
    .set('Authorization', `Bearer ${tokenDe(this, persona)}`);
});

Then(
  'la semana {int} de {int} queda disponible con {int} registros diarios',
  async function (
    this: VfWorld,
    _numeroSemana: number,
    _anio: number,
    cantidad: number,
  ) {
    expect(this.response!.status).toBe(201);
    const res = await request(this.app.getHttpServer())
      .get(`/api/v1/semanas/${this.ids['semana']}/plantilla`)
      .set('Authorization', `Bearer ${this.adminToken}`);
    expect(res.status).toBe(200);
    expect((res.body as unknown[]).length).toBe(cantidad);
  },
);

Then(
  'el sistema rechaza la semana por estar duplicada',
  function (this: VfWorld) {
    expect(this.response!.status).toBe(409);
  },
);

Then('el sistema niega la creación de la semana', function (this: VfWorld) {
  // Solo un responsable de finca puede crear semanas (403).
  expect(this.response!.status).toBe(403);
});

When(
  '{word} lista sus semanas con página {int} y límite {int}',
  async function (this: VfWorld, persona: string, page: number, limit: number) {
    this.response = await request(this.app.getHttpServer())
      .get('/api/v1/semanas')
      .query({ page, limit })
      .set('Authorization', `Bearer ${tokenDe(this, persona)}`);
  },
);

Then(
  'la lista reporta {int} semanas en total y {int} en la página',
  function (this: VfWorld, total: number, enPagina: number) {
    expect(this.response!.status).toBe(200);
    expect(this.response!.body.total).toBe(total);
    expect((this.response!.body.data as unknown[]).length).toBe(enPagina);
  },
);

Then(
  'la semana {int} de {int} ya no está disponible',
  async function (this: VfWorld, _numeroSemana: number, _anio: number) {
    expect(this.response!.status).toBe(204);
    const res = await request(this.app.getHttpServer())
      .get(`/api/v1/semanas/${this.ids['semana']}`)
      .set('Authorization', `Bearer ${this.adminToken}`);
    expect(res.status).toBe(404);
  },
);
