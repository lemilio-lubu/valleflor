import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Elimina de `productos` las columnas del catálogo v1 (per-finca) que el
 * catálogo v2 (global) movió a `colores` y que la entidad Producto ya no declara:
 *   - codigo            (NOT NULL + constraint uq_producto_codigo)
 *   - longitud
 *   - tallos_por_caja   (NOT NULL DEFAULT 400)
 *
 * En prod (`synchronize: false`) estas columnas seguían vivas; al insertar un
 * producto v2 (solo `nombre`) fallaba con
 *   "null value in column codigo violates not-null constraint".
 *
 * Idempotente: todos los DROP son IF EXISTS.
 */
export class DropObsoleteProductoCatalogColumns1750540000000
  implements MigrationInterface
{
  name = 'DropObsoleteProductoCatalogColumns1750540000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "productos" DROP CONSTRAINT IF EXISTS "uq_producto_codigo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" DROP COLUMN IF EXISTS "codigo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" DROP COLUMN IF EXISTS "longitud"`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" DROP COLUMN IF EXISTS "tallos_por_caja"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recrea las columnas del modelo v1 (nullable, sin backfill) por reversibilidad.
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "codigo" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "longitud" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "tallos_por_caja" integer NOT NULL DEFAULT 400`,
    );
  }
}
