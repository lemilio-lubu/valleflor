import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Habilita soft-delete en la tabla `semanas`:
 * 1. Añade columna `deleted_at` (NULL = activa).
 * 2. Elimina el UNIQUE constraint sobre (responsable_id, numero_semana, anio)
 *    porque con soft-delete el mismo responsable puede volver a crear la misma
 *    semana tras ser reasignado a otra finca (la anterior queda soft-deleted).
 *    La unicidad entre semanas activas la garantiza la comprobación en
 *    SemanasService.create() que usa find() con el filtro deleted_at IS NULL
 *    implícito de TypeORM.
 */
export class SoftDeleteSemanas1750500000000 implements MigrationInterface {
  name = 'SoftDeleteSemanas1750500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "semanas" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ DEFAULT NULL`,
    );

    // Eliminar el unique constraint generado por TypeORM sobre las tres columnas.
    // El nombre es auto-generado; lo buscamos por las columnas que lo componen.
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'semanas'
            AND c.contype = 'u'
            AND (
              SELECT array_agg(a.attname ORDER BY a.attname)
              FROM pg_attribute a
              WHERE a.attrelid = c.conrelid
                AND a.attnum = ANY(c.conkey)
            ) = ARRAY['anio'::name, 'numero_semana'::name, 'responsable_id'::name]
        LOOP
          EXECUTE format('ALTER TABLE semanas DROP CONSTRAINT %I', r.conname);
        END LOOP;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "semanas" DROP COLUMN IF EXISTS "deleted_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "semanas" ADD CONSTRAINT "UQ_semanas_responsable_semana_anio"
       UNIQUE ("responsable_id", "numero_semana", "anio")`,
    );
  }
}
