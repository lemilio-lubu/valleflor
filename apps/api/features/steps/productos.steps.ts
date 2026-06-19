import { When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

When(
  'creo un producto con código {string} y nombre {string}',
  async function (this: VfWorld, codigo: string, nombre: string) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`)
      .send({ codigo, nombre });
  },
);

When(
  'creo un producto sin código y con nombre {string}',
  async function (this: VfWorld, nombre: string) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`)
      .send({ nombre });
  },
);

When('consulto los productos sin token', async function (this: VfWorld) {
  this.response = await request(this.app.getHttpServer()).get('/api/v1/productos');
});

Then('la respuesta tiene estado {int}', function (this: VfWorld, status: number) {
  expect(this.response).toBeDefined();
  expect(this.response!.status).toBe(status);
});

Then(
  'el producto creado tiene código {string} y nombre {string}',
  function (this: VfWorld, codigo: string, nombre: string) {
    expect(this.response!.body).toMatchObject({ codigo, nombre });
  },
);
