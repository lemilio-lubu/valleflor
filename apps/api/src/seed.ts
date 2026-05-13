import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';

const DEFAULT_ADMIN_EMAIL = 'admin@valleflor.com';
const DEFAULT_ADMIN_PASSWORD = 'admin123';

function createSeedDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'floricultura_db',
    synchronize: false,
    logging: process.env.NODE_ENV === 'development',
  });
}

function getAdminCredentials(): { email: string; password: string } {
  const email = process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (password) {
    return { email, password };
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('ADMIN_PASSWORD is required in production to run admin seed.');
  }

  return { email, password: DEFAULT_ADMIN_PASSWORD };
}

async function runAdminSeed() {
  const { email, password } = getAdminCredentials();
  const dataSource = createSeedDataSource();
  await dataSource.initialize();

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const existingUsers = await dataSource.query(
      'SELECT id, role FROM users WHERE email = $1 LIMIT 1',
      [email],
    );
    const existingUser = existingUsers[0] as { id: string; role: string } | undefined;

    if (existingUser) {
      await dataSource.query(
        "UPDATE users SET role = 'admin', password_hash = $1, updated_at = NOW() WHERE id = $2",
        [passwordHash, existingUser.id],
      );

      if (existingUser.role !== 'admin') {
        console.log(`Seed admin: user ${email} existed and role was updated to admin.`);
      } else {
        console.log(`Seed admin: user ${email} already exists (password refreshed).`);
      }
      return;
    }

    await dataSource.query(
      `
        INSERT INTO users (id, email, password_hash, role, created_at, updated_at)
        VALUES ($1, $2, $3, 'admin', NOW(), NOW())
      `,
      [randomUUID(), email, passwordHash],
    );
    console.log(`Seed admin: created admin user ${email}.`);
  } finally {
    await dataSource.destroy();
  }
}

runAdminSeed().catch((error: unknown) => {
  console.error('Admin seed failed:', error);
  process.exit(1);
});
