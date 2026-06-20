import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

// Acción de negocio: registrar una finca en la operación. El detalle HTTP
// (endpoint, status) es incidental y queda encapsulado aquí, fuera del .feature.
async function registrarFinca(world: VfWorld, nombre: string) {
  world.response = await request(world.app.getHttpServer())
    .post('/api/v1/fincas')
    .set('Authorization', `Bearer ${world.token}`)
    .send({ nombre });
}

// Helper compartido por F2 y F4: deja una finca lista y registrada.
Given(
  'que la finca {string} está registrada',
  async function (this: VfWorld, nombre: string) {
    await registrarFinca(this, nombre);
    expect(this.response!.status).toBe(201);
    this.ids[`finca:${nombre}`] = this.response!.body.id;
  },
);

When(
  'el administrador registra la finca {string}',
  async function (this: VfWorld, nombre: string) {
    await registrarFinca(this, nombre);
  },
);

When(
  'el administrador intenta registrar nuevamente la finca {string}',
  async function (this: VfWorld, nombre: string) {
    await registrarFinca(this, nombre);
  },
);

async function fincasConNombre(world: VfWorld, nombre: string) {
  const res = await request(world.app.getHttpServer())
    .get('/api/v1/fincas')
    .set('Authorization', `Bearer ${world.token}`);
  expect(res.status).toBe(200);
  return (res.body as Array<{ nombre: string }>).filter((f) => f.nombre === nombre);
}

Then(
  'la finca {string} queda registrada',
  async function (this: VfWorld, nombre: string) {
    expect(this.response!.status).toBe(201);
    expect(await fincasConNombre(this, nombre)).toHaveLength(1);
  },
);

Then(
  'el sistema no duplica la finca {string}',
  async function (this: VfWorld, nombre: string) {
    // El segundo intento es rechazado y la finca sigue registrada una sola vez.
    expect(this.response!.status).toBe(409);
    expect(await fincasConNombre(this, nombre)).toHaveLength(1);
  },
);
