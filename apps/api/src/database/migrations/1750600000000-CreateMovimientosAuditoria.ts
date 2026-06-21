import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Crea la tabla de auditoría del sistema (movimientos_auditoria).
 *
 * En dev/test `synchronize: true` ya la genera a partir de la entidad; esta
 * migración asegura su creación en producción (donde synchronize está apagado),
 * con índices para las consultas por módulo, autor, acción y fecha.
 */
export class CreateMovimientosAuditoria1750600000000
  implements MigrationInterface
{
  name = 'CreateMovimientosAuditoria1750600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "movimientos_auditoria" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "actor_id" uuid,
        "actor_nombre" varchar NOT NULL,
        "accion" varchar NOT NULL,
        "modulo" varchar NOT NULL,
        "valor_anterior" text,
        "valor_nuevo" text,
        "fecha" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_movimientos_auditoria" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mov_aud_modulo" ON "movimientos_auditoria" ("modulo");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mov_aud_actor_nombre" ON "movimientos_auditoria" ("actor_nombre");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mov_aud_accion" ON "movimientos_auditoria" ("accion");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_mov_aud_fecha" ON "movimientos_auditoria" ("fecha");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "movimientos_auditoria";`);
  }
}
