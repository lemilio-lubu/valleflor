import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';

export const ADMIN_EMAIL = 'admin@valleflor.com';
export const ADMIN_PASSWORD = 'admin1234'; // >= 8 chars (cumple LoginDto)

// Limpia todas las tablas entre escenarios. TRUNCATE ... CASCADE respeta FKs
// y reinicia identidades; es O(1) y mucho más rápido que recrear el esquema.
export async function truncateAll(ds: DataSource): Promise<void> {
  const tables = ds.entityMetadatas
    .map((m) => `"${m.tableName}"`)
    .join(', ');
  if (!tables) return;
  await ds.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);
}

// Crea un usuario admin con password conocido (bcrypt rounds=4: rápido en test).
export async function seedAdmin(ds: DataSource): Promise<void> {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 4);
  await ds.query(
    `INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, $3, 'admin', NOW(), NOW())
     ON CONFLICT (email) DO NOTHING`,
    [randomUUID(), ADMIN_EMAIL, hash],
  );
}
