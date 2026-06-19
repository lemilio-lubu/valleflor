import type { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

// La INestApplication es cara de crear; vive en un singleton compartido por
// todos los escenarios (creada en BeforeAll, cerrada en AfterAll).
let app: INestApplication | undefined;

export function setApp(instance: INestApplication): void {
  app = instance;
}

export function getApp(): INestApplication {
  if (!app) throw new Error('[BDD] La app de test no fue inicializada (BeforeAll).');
  return app;
}

export function getDataSource(): DataSource {
  return getApp().get(DataSource);
}
