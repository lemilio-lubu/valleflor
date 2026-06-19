import { BeforeAll, AfterAll, Before } from '@cucumber/cucumber';
import { createTestApp } from './test-app';
import { getApp, getDataSource, setApp } from './app-holder';
import { truncateAll, seedAdmin } from './db';
import { VfWorld } from './world';

// Una sola app para toda la corrida (crear Nest + conectar TypeORM es lento).
BeforeAll({ timeout: 60_000 }, async () => {
  setApp(await createTestApp());
});

// Aislamiento por escenario: BD limpia + admin sembrado.
Before(async function (this: VfWorld) {
  this.app = getApp();
  const ds = getDataSource();
  await truncateAll(ds);
  await seedAdmin(ds);
  this.token = undefined;
  this.response = undefined;
});

AfterAll({ timeout: 30_000 }, async () => {
  await getApp().close();
});
