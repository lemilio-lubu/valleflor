import { When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';
import { tokenDe } from './auth.steps';

interface DiarioRow {
  codigo: string | null;
  totalCajas: number;
  totalTallos: number;
}
interface SemanalRow {
  codigo: string | null;
  numeroSemana: number;
  cajasReales: number;
  cajasEstimadas: number;
}

When(
  'el administrador consulta el consolidado diario de la semana {int} de {int}',
  async function (this: VfWorld, semana: number, anio: number) {
    this.response = await request(this.app.getHttpServer())
      .get('/api/v1/consolidado/diario')
      .query({ semana, anio })
      .set('Authorization', `Bearer ${this.adminToken}`);
  },
);

When(
  'el administrador consulta el consolidado semanal de la semana {int} de {int}',
  async function (this: VfWorld, semana: number, anio: number) {
    this.response = await request(this.app.getHttpServer())
      .get('/api/v1/consolidado/semanal')
      .query({ semanaInicio: semana, semanaFin: semana, anio })
      .set('Authorization', `Bearer ${this.adminToken}`);
  },
);

When(
  '{word} consulta el consolidado diario de la semana {int} de {int}',
  async function (this: VfWorld, persona: string, semana: number, anio: number) {
    this.response = await request(this.app.getHttpServer())
      .get('/api/v1/consolidado/diario')
      .query({ semana, anio })
      .set('Authorization', `Bearer ${tokenDe(this, persona)}`);
  },
);

Then(
  'el consolidado diario del código {string} suma {float} cajas y {float} tallos',
  function (this: VfWorld, codigo: string, cajas: number, tallos: number) {
    expect(this.response!.status).toBe(200);
    const row = (this.response!.body as DiarioRow[]).find((r) => r.codigo === codigo);
    expect(row).toBeTruthy();
    expect(Number(row!.totalCajas)).toBe(cajas);
    expect(Number(row!.totalTallos)).toBe(tallos);
  },
);

Then(
  'el consolidado semanal del código {string} muestra {float} cajas reales y {float} cajas estimadas',
  function (this: VfWorld, codigo: string, reales: number, estimadas: number) {
    expect(this.response!.status).toBe(200);
    const rows = (this.response!.body as SemanalRow[]).filter((r) => r.codigo === codigo);
    expect(rows.length).toBeGreaterThan(0);
    const totalReales = rows.reduce((s, r) => s + Number(r.cajasReales), 0);
    const totalEstimadas = rows.reduce((s, r) => s + Number(r.cajasEstimadas), 0);
    expect(totalReales).toBe(reales);
    expect(totalEstimadas).toBe(estimadas);
  },
);

Then('el sistema niega el acceso al consolidado', function (this: VfWorld) {
  expect(this.response!.status).toBe(403);
});
