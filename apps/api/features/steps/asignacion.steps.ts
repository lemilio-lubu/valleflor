import { When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

// Vinculación (F4): el sistema expande el ítem del catálogo seleccionado (por
// producto, variedad o color) a los colores correspondientes y los asocia al
// responsable. El nivel elegido se traduce aquí al campo que espera el endpoint;
// ese detalle es incidental para la regla de negocio.
When(
  'el administrador asigna a {word} el ítem por {word}',
  async function (this: VfWorld, persona: string, nivel: string) {
    const fincaId = this.ids['finca:Norte'];
    const responsableId = this.ids[`responsable:${persona}`];

    const seleccion: Record<string, string[]> = {};
    if (nivel === 'producto') seleccion.productoIds = [this.ids.producto];
    else if (nivel === 'variedad') seleccion.variedadIds = [this.ids.variedad];
    else if (nivel === 'color') seleccion.colorIds = [this.ids.color];

    this.response = await request(this.app.getHttpServer())
      .post(`/api/v1/fincas/${fincaId}/responsables/${responsableId}/productos`)
      .set('Authorization', `Bearer ${this.token}`)
      .send(seleccion);
  },
);

When(
  'el administrador asigna el ítem a un responsable inexistente de {string}',
  async function (this: VfWorld, fincaNombre: string) {
    const fincaId = this.ids[`finca:${fincaNombre}`];
    // UUID v4 válido en formato pero que no corresponde a ningún responsable.
    const responsableInexistente = '11111111-1111-4111-8111-111111111111';
    this.response = await request(this.app.getHttpServer())
      .post(`/api/v1/fincas/${fincaId}/responsables/${responsableInexistente}/productos`)
      .set('Authorization', `Bearer ${this.token}`)
      .send({ productoIds: [this.ids.producto] });
  },
);

Then('el sistema no registra la asignación', function (this: VfWorld) {
  expect(this.response!.status).toBe(404);
});

Then(
  '{word} tiene asignado el ítem en {string}',
  async function (this: VfWorld, persona: string, fincaNombre: string) {
    expect(this.response!.status).toBe(201);
    const fincaId = this.ids[`finca:${fincaNombre}`];
    const responsableId = this.ids[`responsable:${persona}`];
    const res = await request(this.app.getHttpServer())
      .get(`/api/v1/fincas/${fincaId}/responsables/${responsableId}/colores`)
      .set('Authorization', `Bearer ${this.token}`);
    expect(res.status).toBe(200);
    expect((res.body as string[]).length).toBeGreaterThan(0);
  },
);
