import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * La "integración de catálogo" (commit a796dc4) añadió a la entidad Producto las
 * columnas `codigo`, `longitud`, `tallos_por_caja` y `motivo_baja`, pero no se
 * generó ninguna migración. Con `synchronize: false`, producción quedó sin esas
 * columnas y todas las queries sobre `productos` fallaban
 * (`column Producto.codigo does not exist`).
 *
 * Esta migración es idempotente y segura para datos existentes:
 *  - Agrega las columnas con IF NOT EXISTS (no afecta filas existentes).
 *  - Rellena `codigo` a partir de `nombre`, garantizando unicidad, antes de
 *    aplicar NOT NULL y la restricción única.
 */
export class AddCatalogoColumnsToProductos1750348800000 implements MigrationInterface {
  name = 'AddCatalogoColumnsToProductos1750348800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Nuevas columnas (nullable / con default para no romper filas existentes) ──
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "codigo" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "longitud" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "tallos_por_caja" integer NOT NULL DEFAULT 400`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "motivo_baja" text`,
    );

    // ── Backfill de `codigo` para filas previas al catálogo ─────────────────
    // Deriva el código del nombre (mayúsculas, máx 50). Si dos productos
    // generan el mismo código base, se desambigua con un sufijo numérico para
    // no violar la unicidad.
    await queryRunner.query(`
      WITH ranked AS (
        SELECT
          id,
          UPPER(TRIM(LEFT(nombre, 50))) AS base,
          ROW_NUMBER() OVER (
            PARTITION BY UPPER(TRIM(LEFT(nombre, 50)))
            ORDER BY created_at, id
          ) AS rn
        FROM productos
        WHERE codigo IS NULL OR codigo = ''
      )
      UPDATE productos p
      SET codigo = CASE
        WHEN r.rn = 1 THEN r.base
        ELSE LEFT(r.base, 44) || '-' || r.rn::text
      END
      FROM ranked r
      WHERE p.id = r.id
    `);

    // ── NOT NULL + restricciones únicas (idempotentes) ──────────────────────
    await queryRunner.query(`ALTER TABLE "productos" ALTER COLUMN "codigo" SET NOT NULL`);

    // Las constraints solo se crean si no existen YA y si no hay duplicados.
    // `codigo` está garantizado único por el backfill anterior, pero `nombre`
    // podría tener duplicados preexistentes en datos legados: en ese caso se
    // omite la constraint con un aviso, en lugar de abortar la migración (lo
    // que impediría arrancar la app). El operador puede limpiar duplicados y
    // re-crearla después.
    await queryRunner.query(`
      DO $$
      DECLARE dup_codigo int; dup_nombre int;
      BEGIN
        SELECT count(*) INTO dup_codigo FROM (
          SELECT codigo FROM productos GROUP BY codigo HAVING count(*) > 1
        ) d;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_producto_codigo') THEN
          IF dup_codigo = 0 THEN
            ALTER TABLE "productos" ADD CONSTRAINT "uq_producto_codigo" UNIQUE ("codigo");
          ELSE
            RAISE WARNING 'Se omite uq_producto_codigo: % codigos duplicados', dup_codigo;
          END IF;
        END IF;

        SELECT count(*) INTO dup_nombre FROM (
          SELECT nombre FROM productos GROUP BY nombre HAVING count(*) > 1
        ) d;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_producto_nombre') THEN
          IF dup_nombre = 0 THEN
            ALTER TABLE "productos" ADD CONSTRAINT "uq_producto_nombre" UNIQUE ("nombre");
          ELSE
            RAISE WARNING 'Se omite uq_producto_nombre: % nombres duplicados', dup_nombre;
          END IF;
        END IF;
      END $$;
    `);

    // ── `motivo_baja` también fue añadido (commit b0b488d) a variedades y
    //    colores sin migración. ───────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "variedades" ADD COLUMN IF NOT EXISTS "motivo_baja" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "colores" ADD COLUMN IF NOT EXISTS "motivo_baja" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "colores" DROP COLUMN IF EXISTS "motivo_baja"`);
    await queryRunner.query(`ALTER TABLE "variedades" DROP COLUMN IF EXISTS "motivo_baja"`);
    await queryRunner.query(
      `ALTER TABLE "productos" DROP CONSTRAINT IF EXISTS "uq_producto_codigo"`,
    );
    await queryRunner.query(
      `ALTER TABLE "productos" DROP CONSTRAINT IF EXISTS "uq_producto_nombre"`,
    );
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN IF EXISTS "motivo_baja"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN IF EXISTS "tallos_por_caja"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN IF EXISTS "longitud"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN IF EXISTS "codigo"`);
  }
}
