import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

// La identidad técnica del responsable (email, contraseña) es incidental: se
// deriva del nombre de la persona y se crea entre bastidores.
Given(
  'que {word} es responsable operativa',
  async function (this: VfWorld, persona: string) {
    const email = `${persona.toLowerCase()}@valleflor.com`;
    const res = await request(this.app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ email, password: 'responsable1234', role: 'responsable' });
    expect(res.status).toBe(201);
    this.ids[`user:${persona}`] = res.body.id;
  },
);

// Un usuario que no es responsable operativo: existe en el sistema pero con
// otro rol, por lo que no puede asumir la responsabilidad de una finca.
Given(
  'que {word} no es responsable operativo',
  async function (this: VfWorld, persona: string) {
    const email = `${persona.toLowerCase()}@valleflor.com`;
    const res = await request(this.app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${this.adminToken}`)
      .send({ email, password: 'usuario1234', role: 'admin' });
    expect(res.status).toBe(201);
    this.ids[`user:${persona}`] = res.body.id;
  },
);

// Asignar / transferir responsabilidad: misma acción de negocio (el endpoint
// reasigna la finca del responsable existente). Guarda el responsableId que
// devuelve para reutilizarlo en la vinculación productiva (F4).
async function asignarResponsable(world: VfWorld, persona: string, fincaNombre: string) {
  const fincaId = world.ids[`finca:${fincaNombre}`];
  const userId = world.ids[`user:${persona}`];
  world.response = await request(world.app.getHttpServer())
    .post(`/api/v1/fincas/${fincaId}/responsables`)
    .set('Authorization', `Bearer ${world.adminToken}`)
    .send({ userId });
  if (world.response.status === 201) {
    world.ids[`responsable:${persona}`] = world.response.body.id;
    world.ids[`fincaDe:${persona}`] = fincaId;
  }
}

Given(
  '{word} es responsable de {string}',
  async function (this: VfWorld, persona: string, fincaNombre: string) {
    await asignarResponsable(this, persona, fincaNombre);
    expect(this.response!.status).toBe(201);
  },
);

When(
  'el administrador asigna a {word} como responsable de {string}',
  async function (this: VfWorld, persona: string, fincaNombre: string) {
    await asignarResponsable(this, persona, fincaNombre);
  },
);

When(
  'el administrador transfiere la responsabilidad de {word} a {string}',
  async function (this: VfWorld, persona: string, fincaNombre: string) {
    await asignarResponsable(this, persona, fincaNombre);
  },
);

async function responsablesDeFinca(world: VfWorld, fincaNombre: string) {
  const fincaId = world.ids[`finca:${fincaNombre}`];
  const res = await request(world.app.getHttpServer())
    .get(`/api/v1/fincas/${fincaId}/responsables`)
    .set('Authorization', `Bearer ${world.adminToken}`);
  expect(res.status).toBe(200);
  return res.body as Array<{ userId: string }>;
}

Then(
  '{word} queda asociada a {string}',
  async function (this: VfWorld, persona: string, fincaNombre: string) {
    expect(this.response!.status).toBe(201);
    const userId = this.ids[`user:${persona}`];
    const asociados = await responsablesDeFinca(this, fincaNombre);
    expect(asociados.some((r) => r.userId === userId)).toBe(true);
  },
);

Then(
  '{word} deja de estar asociada a {string}',
  async function (this: VfWorld, persona: string, fincaNombre: string) {
    const userId = this.ids[`user:${persona}`];
    const asociados = await responsablesDeFinca(this, fincaNombre);
    expect(asociados.some((r) => r.userId === userId)).toBe(false);
  },
);

Then(
  'el sistema rechaza la asignación de {word}',
  function (this: VfWorld, _persona: string) {
    // Solo un responsable operativo puede quedar a cargo de una finca (403).
    expect(this.response!.status).toBe(403);
  },
);
