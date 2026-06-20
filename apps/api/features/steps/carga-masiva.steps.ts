import { When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from 'expect';
import request from 'supertest';
import * as xlsx from 'xlsx';
import { VfWorld } from '../support/world';
import { tokenDe } from './auth.steps';

// Construye un buffer .xlsx en memoria a partir de las filas del DataTable.
function buildXlsx(rows: Record<string, string>[]): Buffer {
  const ws = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Hoja1');
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

async function cargar(
  world: VfWorld,
  rows: Record<string, string>[],
  preview: boolean,
): Promise<void> {
  const req = request(world.app.getHttpServer())
    .post('/api/v1/admin/catalog/bulk-upload')
    .set('Authorization', `Bearer ${world.adminToken}`)
    .attach('file', buildXlsx(rows), 'carga.xlsx');
  if (preview) req.field('preview', 'true');
  world.response = await req;
}

When(
  'el administrador realiza una carga masiva con:',
  async function (this: VfWorld, table: DataTable) {
    await cargar(this, table.hashes(), false);
  },
);

When(
  'el administrador previsualiza una carga masiva con:',
  async function (this: VfWorld, table: DataTable) {
    await cargar(this, table.hashes(), true);
  },
);

When('{word} intenta una carga masiva', async function (this: VfWorld, persona: string) {
  this.response = await request(this.app.getHttpServer())
    .post('/api/v1/admin/catalog/bulk-upload')
    .set('Authorization', `Bearer ${tokenDe(this, persona)}`)
    .attach(
      'file',
      buildXlsx([
        { FINCA: 'Norte', RESPONSABLE: 'ANA', CODIGO: '9001', PRODUCTO: 'Rosa', VARIEDAD: 'Freedom', COLOR: 'Rojo' },
      ]),
      'carga.xlsx',
    );
});

Then(
  'la carga reporta {int} insertados y {int} errores',
  function (this: VfWorld, insertados: number, errores: number) {
    expect(this.response!.status).toBe(201);
    expect(this.response!.body.insertados).toBe(insertados);
    expect(this.response!.body.errores).toHaveLength(errores);
  },
);

Then('la carga reporta {int} omitidos', function (this: VfWorld, omitidos: number) {
  expect(this.response!.status).toBe(201);
  expect(this.response!.body.omitidos).toBe(omitidos);
});

Then('el catálogo de productos sigue vacío', async function (this: VfWorld) {
  const res = await request(this.app.getHttpServer())
    .get('/api/v1/productos')
    .set('Authorization', `Bearer ${this.adminToken}`);
  expect(res.status).toBe(200);
  expect((res.body as unknown[]).length).toBe(0);
});

Then('el sistema niega el acceso a la carga masiva', function (this: VfWorld) {
  expect(this.response!.status).toBe(403);
});
