import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';
import { tokenDe } from './auth.steps';
import { getCurrentISOWeek } from '../../src/common/iso-week.util';

interface SemanaData {
  cajas: number;
  tallos: number;
  cajasEstimadas: number;
  tallosEstimados: number;
  esReal: boolean;
}
interface MatrizRow {
  colorId: string;
  semanas: Record<string, SemanaData>;
}

// fincaId es incidental: el servicio resuelve la finca a partir del usuario
// autenticado. Basta con pasar un uuid de finca válido (la registrada "Norte").
function fincaIdIncidental(world: VfWorld): string {
  return world.ids['finca:Norte'];
}

// Datos de la semana actual para el color del ítem en la respuesta de matriz.
function semanaActualDelColor(world: VfWorld): SemanaData {
  const { numeroSemana } = getCurrentISOWeek();
  const rows = world.response!.body as MatrizRow[];
  const row = rows.find((r) => r.colorId === world.ids.color);
  expect(row).toBeTruthy();
  const data = row!.semanas[String(numeroSemana)];
  expect(data).toBeTruthy();
  return data;
}

Given(
  'que {word} ha estimado {float} cajas con divisor {int} para el color en la semana actual',
  async function (this: VfWorld, persona: string, cajas: number, divisor: number) {
    const { numeroSemana, anio } = getCurrentISOWeek();
    this.response = await request(this.app.getHttpServer())
      .patch('/api/v1/base-semanal/estimar')
      .query({ colorId: this.ids.color, numeroSemana, anio, cajasEstimadas: cajas, divisor })
      .set('Authorization', `Bearer ${tokenDe(this, persona)}`);
    expect(this.response.status).toBe(200);
  },
);

Given(
  'que {word} ha estimado {float} cajas con divisor {int} para el color en la semana {int} de {int}',
  async function (
    this: VfWorld,
    persona: string,
    cajas: number,
    divisor: number,
    numeroSemana: number,
    anio: number,
  ) {
    this.response = await request(this.app.getHttpServer())
      .patch('/api/v1/base-semanal/estimar')
      .query({ colorId: this.ids.color, numeroSemana, anio, cajasEstimadas: cajas, divisor })
      .set('Authorization', `Bearer ${tokenDe(this, persona)}`);
    expect(this.response.status).toBe(200);
  },
);

When(
  '{word} consulta la base semanal de la semana actual',
  async function (this: VfWorld, persona: string) {
    this.response = await request(this.app.getHttpServer())
      .get('/api/v1/base-semanal/semana-actual')
      .query({ fincaId: fincaIdIncidental(this) })
      .set('Authorization', `Bearer ${tokenDe(this, persona)}`);
    expect(this.response.status).toBe(200);
  },
);

Then(
  'la base semanal del color refleja {float} cajas reales y {float} tallos reales',
  function (this: VfWorld, cajas: number, tallos: number) {
    const data = semanaActualDelColor(this);
    expect(Number(data.cajas)).toBe(cajas);
    expect(Number(data.tallos)).toBe(tallos);
    expect(data.esReal).toBe(true);
  },
);

Then(
  'la base semanal del color refleja {float} cajas estimadas y {float} tallos estimados',
  function (this: VfWorld, cajas: number, tallos: number) {
    const data = semanaActualDelColor(this);
    expect(Number(data.cajasEstimadas)).toBe(cajas);
    expect(Number(data.tallosEstimados)).toBe(tallos);
  },
);

Then(
  'la base semanal no incluye el color de {word}',
  function (this: VfWorld, _persona: string) {
    const rows = this.response!.body as MatrizRow[];
    expect(rows.some((r) => r.colorId === this.ids.color)).toBe(false);
  },
);

Then(
  'la base semanal del color conserva {float} cajas estimadas y 0 reales',
  function (this: VfWorld, estimadas: number) {
    const data = semanaActualDelColor(this);
    expect(Number(data.cajasEstimadas)).toBe(estimadas);
    expect(Number(data.cajas)).toBe(0);
    expect(data.esReal).toBe(false);
  },
);

// ── limpiar estimaciones de una semana (DELETE /base-semanal/estimar-semana) ──

When(
  'el administrador limpia las estimaciones de la finca de {word} en la semana actual',
  async function (this: VfWorld, _persona: string) {
    const { numeroSemana, anio } = getCurrentISOWeek();
    this.response = await request(this.app.getHttpServer())
      .delete('/api/v1/base-semanal/estimar-semana')
      .query({ fincaId: this.ids['finca:Norte'], numeroSemana, anio })
      .set('Authorization', `Bearer ${this.adminToken}`);
    expect(this.response.status).toBe(200);
  },
);

// ── matriz multi-semana (GET /base-semanal con startWeek/startYear) ────────────

function matrizSemana(world: VfWorld, numeroSemana: number): SemanaData {
  const rows = world.response!.body.rows as MatrizRow[];
  const row = rows.find((r) => r.colorId === world.ids.color);
  expect(row).toBeTruthy();
  const data = row!.semanas[String(numeroSemana)];
  expect(data).toBeTruthy();
  return data;
}

When(
  '{word} consulta la matriz desde la semana {int} de {int} por {int} semanas',
  async function (
    this: VfWorld,
    persona: string,
    startWeek: number,
    startYear: number,
    semanas: number,
  ) {
    this.response = await request(this.app.getHttpServer())
      .get('/api/v1/base-semanal')
      .query({ fincaId: fincaIdIncidental(this), semanas, startWeek, startYear })
      .set('Authorization', `Bearer ${tokenDe(this, persona)}`);
    expect(this.response.status).toBe(200);
  },
);

Then('la semana {int} del color es real', function (this: VfWorld, numeroSemana: number) {
  expect(matrizSemana(this, numeroSemana).esReal).toBe(true);
});

Then('la semana {int} del color no es real', function (this: VfWorld, numeroSemana: number) {
  expect(matrizSemana(this, numeroSemana).esReal).toBe(false);
});
