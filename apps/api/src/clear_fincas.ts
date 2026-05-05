import 'dotenv/config';
import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'floricultura_db',
});

async function clear() {
  await AppDataSource.initialize();
  console.log('Connected to DB');
  // Cascade delete everything related to fincas
  await AppDataSource.query('TRUNCATE TABLE fincas CASCADE');
  console.log('All Fincas and their cascading dependencies (products, varieties, colors, etc) have been deleted.');
  await AppDataSource.destroy();
}

clear().catch(console.error);
