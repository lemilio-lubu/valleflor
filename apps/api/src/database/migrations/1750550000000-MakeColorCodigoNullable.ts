import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La carga masiva ahora acepta filas sin CODIGO (columna opcional): esos
 * colores se identifican por variedad+nombre en vez de por código. Postgres
 * permite múltiples NULL en una columna única (a diferencia de múltiples
 * cadenas vacías), así que basta con quitar el NOT NULL — el índice único
 * `uq_color_codigo` no se toca.
 */
export class MakeColorCodigoNullable1750550000000 implements MigrationInterface {
  name = 'MakeColorCodigoNullable1750550000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "colores" ALTER COLUMN "codigo" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "colores" SET "codigo" = '' WHERE "codigo" IS NULL`);
    await queryRunner.query(`ALTER TABLE "colores" ALTER COLUMN "codigo" SET NOT NULL`);
  }
}
