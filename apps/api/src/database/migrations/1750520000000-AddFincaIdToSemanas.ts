import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reemplaza el soft-delete de semanas por finca_id:
 *
 * Problema original: al reasignar un responsable entre fincas, sus semanas se
 * soft-deletaban. Al volver a la finca anterior, esas semanas quedaban ocultas
 * para siempre.
 *
 * Solución: igual que base_semanal, se añade finca_id a semanas. Las queries
 * del responsable filtran por finca actual; al volver a una finca anterior
 * recupera sus semanas porque siguen en la BD, solo filtradas por finca_id.
 *
 * Pasos:
 * 1. Borrar registros_diarios huérfanos de semanas soft-deletadas
 * 2. Borrar las semanas soft-deletadas
 * 3. Eliminar la columna deleted_at (ya no se usa)
 * 4. Añadir finca_id y hacer backfill desde responsables
 * 5. Recrear la unique constraint incluyendo finca_id
 */
export class AddFincaIdToSemanas1750520000000 implements MigrationInterface {
  name = 'AddFincaIdToSemanas1750520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1-3. Si la columna deleted_at aún existe (solo si synchronize no la eliminó),
    // limpiar las semanas soft-deletadas y quitar la columna.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'semanas' AND column_name = 'deleted_at'
        ) THEN
          DELETE FROM "registros_diarios"
          WHERE semana_id IN (SELECT id FROM "semanas" WHERE deleted_at IS NOT NULL);

          DELETE FROM "semanas" WHERE deleted_at IS NOT NULL;

          ALTER TABLE "semanas" DROP COLUMN "deleted_at";
        END IF;
      END $$;
    `);

    // 4. Añadir finca_id
    await queryRunner.query(
      `ALTER TABLE "semanas" ADD COLUMN IF NOT EXISTS "finca_id" UUID`,
    );

    // 5. Backfill: asignar la finca actual del responsable
    await queryRunner.query(`
      UPDATE "semanas" s
      SET finca_id = r.finca_id
      FROM "responsables" r
      WHERE r.id = s.responsable_id
        AND s.finca_id IS NULL
    `);

    // 6. Eliminar la unique constraint anterior (solo numeroSemana+anio+responsable)
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

    // 7. Crear nueva unique constraint incluyendo finca_id
    await queryRunner.query(`
      ALTER TABLE "semanas"
      ADD CONSTRAINT "UQ_semanas_responsable_semana_anio_finca"
      UNIQUE ("responsable_id", "numero_semana", "anio", "finca_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "semanas" DROP CONSTRAINT IF EXISTS "UQ_semanas_responsable_semana_anio_finca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "semanas" DROP COLUMN IF EXISTS "finca_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "semanas" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ DEFAULT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE "semanas"
      ADD CONSTRAINT "UQ_semanas_responsable_semana_anio"
      UNIQUE ("responsable_id", "numero_semana", "anio")
    `);
  }
}
