import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientoAuditoria } from './movimiento-auditoria.entity';
import { User } from '../users/user.entity';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaPdfService } from './auditoria-pdf.service';
import { AuditoriaController } from './auditoria.controller';

/**
 * Global para que cualquier servicio de dominio (fincas, usuarios, catálogo,
 * carga masiva, auth) pueda inyectar AuditoriaService sin importar este módulo
 * explícitamente. AuditoriaService solo depende de su tabla y de User (lectura
 * del nombre del actor), nunca de los módulos de dominio: sin ciclos.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MovimientoAuditoria, User])],
  controllers: [AuditoriaController],
  providers: [AuditoriaService, AuditoriaPdfService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
