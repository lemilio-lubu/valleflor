import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.migrateResponsableNombre();
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
