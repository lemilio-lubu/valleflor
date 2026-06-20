import { BeforeAll, AfterAll, Before } from '@cucumber/cucumber';
import request from 'supertest';
import { createTestApp } from './test-app';
import { getApp, getDataSource, setApp } from './app-holder';
import { truncateAll, seedAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from './db';
import { setNowProvider, resetNowProvider } from '../../src/common/clock';
import { VfWorld } from './world';

// Reloj con inicio fijo para hacer deterministas las pruebas que dependen de la
// semana ISO actual (getCurrentISOWeek → clock.now()). Se sobrescribe SOLO el
// proveedor de tiempo de la app (sin tocar el `Date` global, para no introducir
// flakiness en el harness in-process). Fijado a un lunes ISO = semana 25 de 2026.
export const FROZEN_NOW = new Date('2026-06-15T12:00:00Z');

// Una sola app para toda la corrida (crear Nest + conectar TypeORM es lento).
BeforeAll({ timeout: 60_000 }, async () => {
  setApp(await createTestApp());
  setNowProvider(() => FROZEN_NOW);
});

// Aislamiento por escenario: BD limpia + admin sembrado.
// La autenticación del administrador es incidental para las reglas de negocio
// (BDD en acción §7.6.6): se resuelve entre bastidores aquí para que los
// escenarios no tengan que mencionar el login. Los pasos que prueban la
// ausencia de credenciales simplemente omiten el header Authorization.
Before(async function (this: VfWorld) {
  this.app = getApp();
  const ds = getDataSource();
  await truncateAll(ds);
  await seedAdmin(ds);
  this.ids = {};
  this.tokens = {};
  this.response = undefined;

  const login = await request(this.app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  this.token = login.body?.accessToken;
  this.adminToken = this.token;
});

AfterAll({ timeout: 30_000 }, async () => {
  resetNowProvider();
  await getApp().close();
});
