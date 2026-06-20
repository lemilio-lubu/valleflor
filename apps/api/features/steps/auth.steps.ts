import { Given, When } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';

// La contraseña de los responsables es incidental: coincide con la que usa
// `responsables.steps.ts` al crear el usuario (`responsable1234`).
const RESPONSABLE_PASSWORD = 'responsable1234';

// Inicia sesión como una persona (responsable) y deja su JWT activo en
// `this.token`, además de guardarlo en `this.tokens[persona]` para poder
// alternar identidad más adelante en el escenario.
async function iniciarSesion(world: VfWorld, persona: string): Promise<void> {
  const email = `${persona.toLowerCase()}@valleflor.com`;
  const res = await request(world.app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password: RESPONSABLE_PASSWORD });
  expect(res.status).toBe(200);
  const token = res.body?.accessToken as string;
  expect(token).toBeTruthy();
  world.tokens[persona] = token;
  world.token = token;
}

// Devuelve el token de una persona ya autenticada (helper para otros steps).
export function tokenDe(world: VfWorld, persona: string): string {
  const token = world.tokens[persona];
  if (!token) {
    throw new Error(`La persona "${persona}" no ha iniciado sesión en este escenario`);
  }
  return token;
}

Given('que {word} ha iniciado sesión', async function (this: VfWorld, persona: string) {
  await iniciarSesion(this, persona);
});

When('{word} inicia sesión', async function (this: VfWorld, persona: string) {
  await iniciarSesion(this, persona);
});
