import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import type { INestApplication } from '@nestjs/common';
import type { Response } from 'supertest';

// Estado compartido entre los steps de un mismo escenario.
export class VfWorld extends World {
  app!: INestApplication;
  token?: string;
  response?: Response;

  // IDs de recursos creados durante un escenario (fincas, responsables y
  // catálogo). Los escenarios de Pilar 1 encadenan recursos, así que se
  // guardan por clave lógica para reutilizarlos entre steps.
  ids: Record<string, string> = {};

  constructor(opts: IWorldOptions) {
    super(opts);
  }
}

setWorldConstructor(VfWorld);
