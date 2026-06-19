// PRIMER archivo cargado por Cucumber. Fija el entorno de pruebas ANTES de
// que se importe AppModule (cuyo TypeOrmModule lee process.env al construirse).
import 'reflect-metadata';
import { config } from 'dotenv';
import { resolve } from 'path';

// Carga .env.test (override: gana sobre cualquier valor ya presente).
config({ path: resolve(__dirname, '../../.env.test'), override: true });

// Overrides defensivos por si .env.test faltara.
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.DATABASE_NAME = process.env.DATABASE_NAME || 'floricultura_test';
process.env.SWAGGER_ENABLED = 'false';

// Red de seguridad: jamás correr synchronize destructivo contra la BD de dev.
if (process.env.DATABASE_NAME !== 'floricultura_test') {
  throw new Error(
    `[BDD] DATABASE_NAME debe ser "floricultura_test", recibido "${process.env.DATABASE_NAME}". Abortando para proteger la BD de desarrollo.`,
  );
}
