import { setWorldConstructor, World, IWorldOptions } from '@cucumber/cucumber';
import type { INestApplication } from '@nestjs/common';
import type { Response } from 'supertest';

// Estado compartido entre los steps de un mismo escenario.
export class VfWorld extends World {
  app!: INestApplication;
  token?: string;
  response?: Response;

  // Token del admin sembrado (lo deja el hook Before). Permite recuperar la
  // identidad de administrador después de haber iniciado sesión como otra
  // persona (p. ej. un responsable) durante un escenario.
  adminToken?: string;

  // Token por persona que inicia sesión durante el escenario (clave = nombre,
  // p. ej. "Ana"). Los features del core operativo alternan entre la identidad
  // del responsable (crear semana, estimar) y la del admin (consolidado).
  tokens: Record<string, string> = {};

  // IDs de recursos creados durante un escenario (fincas, responsables y
  // catálogo). Los escenarios de Pilar 1 encadenan recursos, así que se
  // guardan por clave lógica para reutilizarlos entre steps.
  ids: Record<string, string> = {};

  constructor(opts: IWorldOptions) {
    super(opts);
  }
}

setWorldConstructor(VfWorld);
