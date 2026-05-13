import 'dotenv/config';
import { AppDataSource } from './data-source';

async function runMigrations() {
  await AppDataSource.initialize();

  try {
    await AppDataSource.runMigrations();

    const usersTableExistsResult = (await AppDataSource.query(
      "SELECT to_regclass('public.users') AS users_table",
    )) as Array<{ users_table: string | null }>;

    const usersTableExists = Boolean(usersTableExistsResult[0]?.users_table);
    if (!usersTableExists) {
      console.warn(
        'Migrations finished but users table is missing. Running schema sync fallback once.',
      );
      await AppDataSource.synchronize();
    }

    console.log('Database migration step completed.');
  } finally {
    await AppDataSource.destroy();
  }
}

runMigrations().catch((error: unknown) => {
  console.error('Migration step failed:', error);
  process.exit(1);
});
