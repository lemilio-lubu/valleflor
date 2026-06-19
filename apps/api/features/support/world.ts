import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import type { INestApplication } from '@nestjs/common';
import type { Response } from 'supertest';

// Estado compartido entre los steps de un mismo escenario.
export class VfWorld extends World {
  app!: INestApplication;
  token?: string;
  response?: Response;

  constructor(opts: IWorldOptions) {
    super(opts);
  }
}

setWorldConstructor(VfWorld);
