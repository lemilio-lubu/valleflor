import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActivoCodigoNombreOriginal1748381200000 implements MigrationInterface {
  name = 'AddActivoCodigoNombreOriginal1748381200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── New columns ──────────────────────────────────────────────────────────
    await queryRunner.query(`ALTER TABLE "colores" ADD COLUMN IF NOT EXISTS "activo" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "colores" ADD COLUMN IF NOT EXISTS "codigo" character varying(20)`);
    await queryRunner.query(`ALTER TABLE "colores" ADD COLUMN IF NOT EXISTS "nombre_original" character varying(200)`);
    await queryRunner.query(`ALTER TABLE "variedades" ADD COLUMN IF NOT EXISTS "activo" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "productos" ADD COLUMN IF NOT EXISTS "activo" boolean NOT NULL DEFAULT true`);

    // ── Fix FK base_semanal → colores: add ON DELETE CASCADE ────────────────
    await queryRunner.query(`ALTER TABLE "base_semanal" DROP CONSTRAINT IF EXISTS "FK_c51ad101f865b16fbf27da67af3"`);
    await queryRunner.query(`
      ALTER TABLE "base_semanal"
      ADD CONSTRAINT "FK_c51ad101f865b16fbf27da67af3"
      FOREIGN KEY ("color_id") REFERENCES "colores"("id") ON DELETE CASCADE
    `);

    // ── Fix FK registros_diarios → colores: add ON DELETE CASCADE ───────────
    // Drop whatever the current FK name is, then recreate
    await queryRunner.query(`
      DO $$
      DECLARE fk TEXT;
      BEGIN
        SELECT tc.constraint_name INTO fk
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'registros_diarios'
          AND kcu.column_name = 'color_id';
        IF fk IS NOT NULL THEN
          EXECUTE format('ALTER TABLE registros_diarios DROP CONSTRAINT %I', fk);
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      ALTER TABLE "registros_diarios"
      ADD CONSTRAINT "FK_registros_diarios_color_id_cascade"
      FOREIGN KEY ("color_id") REFERENCES "colores"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "colores" DROP COLUMN IF EXISTS "activo"`);
    await queryRunner.query(`ALTER TABLE "colores" DROP COLUMN IF EXISTS "codigo"`);
    await queryRunner.query(`ALTER TABLE "colores" DROP COLUMN IF EXISTS "nombre_original"`);
    await queryRunner.query(`ALTER TABLE "variedades" DROP COLUMN IF EXISTS "activo"`);
    await queryRunner.query(`ALTER TABLE "productos" DROP COLUMN IF EXISTS "activo"`);
  }
}
