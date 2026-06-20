import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La columna `longitud` de `colores` quedó en desuso: la "Longitud (cm)" se
 * eliminó del modal de definición productiva, de la carga masiva y de la
 * entidad. Esta migración la retira de la base de datos.
 *
 * Idempotente y segura: usa IF EXISTS / IF NOT EXISTS, por lo que puede correr
 * en entornos donde la columna nunca llegó a crearse (producción tenía
 * `synchronize: false` y `colores` pudo no incluirla).
 */
export class DropLongitudFromColores1750384800000 implements MigrationInterface {
  name = 'DropLongitudFromColores1750384800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "colores" DROP COLUMN IF EXISTS "longitud"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "colores" ADD COLUMN IF NOT EXISTS "longitud" integer`);
  }
}
