import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Añade finca_id a base_semanal para aislar los datos por finca.
 *
 * Sin esta columna, si un responsable se reasigna de Finca A → Finca B,
 * sus filas históricas (con responsable_id = mismo ID) aparecen mezcladas
 * en la vista "Base Semanal" del responsable en Finca B.
 *
 * Con finca_id:
 *  - La vista del responsable filtra por su finca actual → solo ve Finca B.
 *  - El consolidado del admin NO filtra por finca → sigue sumando todo. ✓
 *  - Las filas de Finca A y Finca B pueden coexistir para la misma semana
 *    sin conflicto (la clave única ahora incluye finca_id).
 */
export class AddFincaIdToBaseSemanal1750510000000 implements MigrationInterface {
  name = 'AddFincaIdToBaseSemanal1750510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Añadir columna (nullable para no romper filas existentes)
    await queryRunner.query(
      `ALTER TABLE "base_semanal" ADD COLUMN IF NOT EXISTS "finca_id" UUID`,
    );

    // 2. Backfill: asignar la finca actual del responsable a sus filas existentes
    await queryRunner.query(`
      UPDATE "base_semanal" bs
      SET finca_id = r.finca_id
      FROM "responsables" r
      WHERE r.id = bs.responsable_id
        AND bs.finca_id IS NULL
    `);

    // 3. Eliminar el unique constraint anterior sobre (responsable_id, color_id, numero_semana, anio)
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          WHERE t.relname = 'base_semanal'
            AND c.contype = 'u'
            AND (
              SELECT array_agg(a.attname ORDER BY a.attname)
              FROM pg_attribute a
              WHERE a.attrelid = c.conrelid
                AND a.attnum = ANY(c.conkey)
            ) = ARRAY['anio'::name, 'color_id'::name, 'numero_semana'::name, 'responsable_id'::name]
        LOOP
          EXECUTE format('ALTER TABLE base_semanal DROP CONSTRAINT %I', r.conname);
        END LOOP;
      END $$;
    `);

    // 4. Crear nuevo unique constraint que incluye finca_id
    await queryRunner.query(`
      ALTER TABLE "base_semanal"
      ADD CONSTRAINT "UQ_base_semanal_resp_color_semana_finca"
      UNIQUE ("responsable_id", "color_id", "numero_semana", "anio", "finca_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "base_semanal" DROP CONSTRAINT IF EXISTS "UQ_base_semanal_resp_color_semana_finca"`,
    );
    await queryRunner.query(
      `ALTER TABLE "base_semanal" DROP COLUMN IF EXISTS "finca_id"`,
    );
    await queryRunner.query(`
      ALTER TABLE "base_semanal"
      ADD CONSTRAINT "UQ_base_semanal_resp_color_semana_anio"
      UNIQUE ("responsable_id", "color_id", "numero_semana", "anio")
    `);
  }
}
