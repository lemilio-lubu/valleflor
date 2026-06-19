import { Given } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import { VfWorld } from '../support/world';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from '../support/db';

Given('que estoy autenticado como admin', async function (this: VfWorld) {
  const res = await request(this.app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

  expect(res.status).toBe(200);
  expect(res.body.accessToken).toBeDefined();
  this.token = res.body.accessToken;
});
