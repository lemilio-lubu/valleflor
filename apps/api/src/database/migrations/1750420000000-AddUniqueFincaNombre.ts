import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * F1 — Definición de Fincas: una finca debe mantener una única representación
 * dentro de la estructura productiva. La entidad `Finca` no tenía restricción
 * de unicidad sobre `nombre`, por lo que se permitían duplicados. Esta migración
 * añade `uq_finca_nombre`.
 *
 * Es idempotente y segura para datos legados: si existieran fincas con nombre
 * duplicado en producción, se omite la creación de la constraint con un WARNING
 * (en lugar de abortar y dejar la app sin arrancar). El operador puede limpiar
 * los duplicados y re-aplicarla. Espeja el patrón usado en
 * 1750348800000-AddCatalogoColumnsToProductos.
 */
export class AddUniqueFincaNombre1750420000000 implements MigrationInterface {
  name = 'AddUniqueFincaNombre1750420000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE dup_nombre int;
      BEGIN
        SELECT count(*) INTO dup_nombre FROM (
          SELECT nombre FROM fincas GROUP BY nombre HAVING count(*) > 1
        ) d;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_finca_nombre') THEN
          IF dup_nombre = 0 THEN
            ALTER TABLE "fincas" ADD CONSTRAINT "uq_finca_nombre" UNIQUE ("nombre");
          ELSE
            RAISE WARNING 'Se omite uq_finca_nombre: % nombres duplicados', dup_nombre;
          END IF;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fincas" DROP CONSTRAINT IF EXISTS "uq_finca_nombre"`,
    );
  }
}
