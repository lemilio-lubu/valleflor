import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reconcilia el esquema de producción con el catálogo v2 (global) y el campo
 * nombre_comercial. Producción se creó con `synchronize: false`, así que varios
 * cambios de entidad nunca llegaron a la BD:
 *
 *  1. `colores.nombre_comercial` se añadió a la entidad Color pero sin migración
 *     → ColoresService.findAll y ConsolidadoService.getDiario fallaban con
 *       "column ... nombre_comercial does not exist".
 *
 *  2. El catálogo pasó de per-finca a global: Producto ya no tiene finca_id,
 *     pero en prod la columna `productos.finca_id` sigue siendo NOT NULL (modelo
 *     viejo) → todo INSERT de producto fallaba con "null value in column
 *     finca_id violates not-null constraint".
 *
 * Esta migración es idempotente y no aborta el arranque si hay datos previos.
 */
export class ReconcileCatalogoV2Prod1750530000000 implements MigrationInterface {
  name = 'ReconcileCatalogoV2Prod1750530000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. colores.nombre_comercial (nullable, igual que la entidad)
    await queryRunner.query(
      `ALTER TABLE "colores" ADD COLUMN IF NOT EXISTS "nombre_comercial" VARCHAR(200)`,
    );

    // 2. Catálogo global: eliminar productos.finca_id.
    //    DROP COLUMN elimina en cascada la FK y la unique compuesta (finca_id, nombre)
    //    que dependían de ella.
    await queryRunner.query(
      `ALTER TABLE "productos" DROP COLUMN IF EXISTS "finca_id"`,
    );

    // 3. Recrear la unique global sobre nombre (uq_producto_nombre) si no existe.
    //    Resiliente: si hay nombres duplicados (de fincas distintas en el modelo
    //    viejo) no aborta la migración — solo deja un aviso para limpiar a mano.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_producto_nombre'
        ) THEN
          BEGIN
            ALTER TABLE "productos"
              ADD CONSTRAINT "uq_producto_nombre" UNIQUE ("nombre");
          EXCEPTION WHEN unique_violation THEN
            RAISE NOTICE 'uq_producto_nombre no creada: existen nombres de producto duplicados; depurar manualmente.';
          END;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "productos" DROP CONSTRAINT IF EXISTS "uq_producto_nombre"`,
    );
    await queryRunner.query(
      `ALTER TABLE "colores" DROP COLUMN IF EXISTS "nombre_comercial"`,
    );
    // finca_id no se restaura: el catálogo v2 es global por diseño.
  }
}
