import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

interface ItemCatalogo {
  producto: string;
  variedad: string;
  color: string;
  codigo: string;
  nombre: string;
}

/**
 * El "ítem de catálogo" se materializa en la jerarquía real producto → variedad
 * → color, donde el producto lo identifica por su `codigo` único y su `nombre`
 * comercial. Toda esa orquestación técnica es incidental y queda encapsulada
 * aquí. La cadena se detiene en el primer paso rechazado (p. ej. código
 * duplicado) y deja esa respuesta en el World.
 */
async function incorporarItem(
  world: VfWorld,
  def: ItemCatalogo,
): Promise<void> {
  const auth = `Bearer ${world.token}`;

  const pRes = await request(world.app.getHttpServer())
    .post('/api/v1/productos')
    .set('Authorization', auth)
    .send({ codigo: def.codigo, nombre: def.nombre });
  world.response = pRes;
  if (pRes.status !== 201) return;
  world.ids.producto = pRes.body.id;

  const vRes = await request(world.app.getHttpServer())
    .post('/api/v1/variedades')
    .set('Authorization', auth)
    .send({ nombre: `${def.producto} ${def.variedad}`, productoId: pRes.body.id });
  world.response = vRes;
  if (vRes.status !== 201) return;
  world.ids.variedad = vRes.body.id;

  const cRes = await request(world.app.getHttpServer())
    .post('/api/v1/colores')
    .set('Authorization', auth)
    .send({ nombre: def.color, variedadId: vRes.body.id });
  world.response = cRes;
  if (cRes.status === 201) {
    world.ids.color = cRes.body.id;
  }
}

When(
  'el administrador incorpora al catálogo el ítem {string} con código {string}, del producto {string}, variedad {string} y color {string}',
  async function (
    this: VfWorld,
    nombre: string,
    codigo: string,
    producto: string,
    variedad: string,
    color: string,
  ) {
    await incorporarItem(this, { producto, variedad, color, codigo, nombre });
  },
);

Given(
  'que el catálogo contiene el ítem {string} con código {string}, del producto {string}, variedad {string} y color {string}',
  async function (
    this: VfWorld,
    nombre: string,
    codigo: string,
    producto: string,
    variedad: string,
    color: string,
  ) {
    await incorporarItem(this, { producto, variedad, color, codigo, nombre });
    expect(this.response!.status).toBe(201);
  },
);

// Verifica que el ítem quedó registrado en toda su composición: el producto en
// el catálogo, la variedad colgando del producto y el color colgando de la
// variedad. Esto prueba la combinación completa, no solo el producto.
Then(
  'el ítem {string} queda registrado con su producto, variedad y color',
  async function (this: VfWorld, _nombre: string) {
    const auth = `Bearer ${this.token}`;

    const prod = await request(this.app.getHttpServer())
      .get('/api/v1/productos')
      .set('Authorization', auth);
    expect(prod.status).toBe(200);
    expect(
      (prod.body as Array<{ id: string }>).some((p) => p.id === this.ids.producto),
    ).toBe(true);

    const variedades = await request(this.app.getHttpServer())
      .get(`/api/v1/variedades?productoId=${this.ids.producto}`)
      .set('Authorization', auth);
    expect(variedades.status).toBe(200);
    expect(
      (variedades.body as Array<{ id: string }>).some((v) => v.id === this.ids.variedad),
    ).toBe(true);

    const colores = await request(this.app.getHttpServer())
      .get(`/api/v1/colores?variedadId=${this.ids.variedad}`)
      .set('Authorization', auth);
    expect(colores.status).toBe(200);
    expect(
      (colores.body as Array<{ id: string }>).some((c) => c.id === this.ids.color),
    ).toBe(true);
  },
);
