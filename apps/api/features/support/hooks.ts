import { BeforeAll, AfterAll, Before } from '@cucumber/cucumber';
import request from 'supertest';
import { createTestApp } from './test-app';
import { getApp, getDataSource, setApp } from './app-holder';
import { truncateAll, seedAdmin, ADMIN_EMAIL, ADMIN_PASSWORD } from './db';
import { VfWorld } from './world';

// Una sola app para toda la corrida (crear Nest + conectar TypeORM es lento).
BeforeAll({ timeout: 60_000 }, async () => {
  setApp(await createTestApp());
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
  this.response = undefined;

  const login = await request(this.app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  this.token = login.body?.accessToken;
});

AfterAll({ timeout: 30_000 }, async () => {
  await getApp().close();
});
