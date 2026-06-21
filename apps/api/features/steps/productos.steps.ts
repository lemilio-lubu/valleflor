import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

// Acción de negocio: registrar un producto (tipo de flor) en el catálogo. El
// producto se identifica por su nombre único; el código comercial pertenece al
// ítem (producto + variedad + color), no al producto. El detalle HTTP es
// incidental y queda encapsulado aquí, fuera del .feature.
When(
  'el administrador registra el producto {string}',
  async function (this: VfWorld, nombre: string) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`)
      .send({ nombre });
  },
);

// Deja un producto ya registrado para preparar el caso de nombre duplicado.
Given(
  'que el catálogo contiene el producto {string}',
  async function (this: VfWorld, nombre: string) {
    const res = await request(this.app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`)
      .send({ nombre });
    expect(res.status).toBe(201);
  },
);

When(
  'el administrador registra el producto sin nombre',
  async function (this: VfWorld) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`)
      .send({});
  },
);

When('alguien sin autenticación consulta el catálogo de productos', async function (this: VfWorld) {
  this.response = await request(this.app.getHttpServer()).get('/api/v1/productos');
});

Then(
  'el producto {string} forma parte del catálogo',
  async function (this: VfWorld, nombre: string) {
    expect(this.response!.status).toBe(201);
    const res = await request(this.app.getHttpServer())
      .get('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`);
    expect(res.status).toBe(200);
    const productos = res.body as Array<{ nombre: string }>;
    expect(productos.some((p) => p.nombre === nombre.toUpperCase())).toBe(true);
  },
);

Then('el sistema rechaza el producto por falta de nombre', function (this: VfWorld) {
  expect(this.response!.status).toBe(400);
});

Then('el sistema rechaza el producto por nombre duplicado', function (this: VfWorld) {
  expect(this.response!.status).toBe(409);
});

Then('el sistema niega el acceso', function (this: VfWorld) {
  expect(this.response!.status).toBe(401);
});
