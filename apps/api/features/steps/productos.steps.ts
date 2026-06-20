import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

// Acción de negocio: registrar un producto (tipo de flor) en el catálogo. El
// detalle HTTP es incidental y queda encapsulado aquí, fuera del .feature.
When(
  'el administrador registra el producto {string} con código {string}',
  async function (this: VfWorld, nombre: string, codigo: string) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`)
      .send({ codigo, nombre });
  },
);

// Deja un producto ya registrado para preparar el caso de código duplicado.
Given(
  'que el catálogo contiene el producto {string} con código {string}',
  async function (this: VfWorld, nombre: string, codigo: string) {
    const res = await request(this.app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`)
      .send({ codigo, nombre });
    expect(res.status).toBe(201);
  },
);

When(
  'el administrador registra el producto {string} sin código',
  async function (this: VfWorld, nombre: string) {
    this.response = await request(this.app.getHttpServer())
      .post('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`)
      .send({ nombre });
  },
);

When('alguien sin autenticación consulta el catálogo de productos', async function (this: VfWorld) {
  this.response = await request(this.app.getHttpServer()).get('/api/v1/productos');
});

Then(
  'el producto {string} forma parte del catálogo con código {string}',
  async function (this: VfWorld, nombre: string, codigo: string) {
    expect(this.response!.status).toBe(201);
    const res = await request(this.app.getHttpServer())
      .get('/api/v1/productos')
      .set('Authorization', `Bearer ${this.token}`);
    expect(res.status).toBe(200);
    const productos = res.body as Array<{ codigo: string; nombre: string }>;
    expect(
      productos.some(
        (p) => p.nombre === nombre.toUpperCase() && p.codigo === codigo.toUpperCase(),
      ),
    ).toBe(true);
  },
);

Then('el sistema rechaza el producto por falta de código', function (this: VfWorld) {
  expect(this.response!.status).toBe(400);
});

Then('el sistema rechaza el producto por código duplicado', function (this: VfWorld) {
  expect(this.response!.status).toBe(409);
});

Then('el sistema niega el acceso', function (this: VfWorld) {
  expect(this.response!.status).toBe(401);
});
