import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.ensureConfiguracionTable();
    await this.migrateResponsableNombre();
  }

  private async ensureConfiguracionTable() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      const tableExists = await queryRunner.hasTable('configuracion');
      if (tableExists) return;

      await queryRunner.query(`
        CREATE TABLE configuracion (
          id SERIAL PRIMARY KEY,
          tallos_por_caja INT NOT NULL DEFAULT 400,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await queryRunner.query(`
        INSERT INTO configuracion (id, tallos_por_caja) VALUES (1, 400)
      `);
      this.logger.log('Tabla configuracion creada con fila inicial');
    } catch (err) {
      this.logger.error('Error creando tabla configuracion', err);
    } finally {
      await queryRunner.release();
    }
  }

  private async migrateResponsableNombre() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      const columnExists = await queryRunner.hasColumn('responsables', 'nombre');
      if (!columnExists) return;

      // Copia responsable.nombre → user.nombre donde user.nombre sea null
      await queryRunner.query(`
        UPDATE users u
        SET nombre = r.nombre
        FROM responsables r
        WHERE r.user_id = u.id
          AND u.nombre IS NULL
          AND r.nombre IS NOT NULL
      `);

      await queryRunner.dropColumn('responsables', 'nombre');
      this.logger.log('Migración completada: columna responsables.nombre eliminada');
    } catch (err) {
      this.logger.error('Error en migración de responsables.nombre', err);
    } finally {
      await queryRunner.release();
    }
  }
}
