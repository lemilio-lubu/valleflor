import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseSemanal } from './base-semanal.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { Semana } from '../semanas/semana.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';
import { Color } from '../colores/color.entity';
import { BaseSemanalService } from './base-semanal.service';
import { SemanaReconciliationService } from './semana-reconciliation.service';
import { BaseSemanalController } from './base-semanal.controller';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BaseSemanal, RegistroDiario, Semana, Responsable, ResponsableColor, Color]),
    ConfiguracionModule,
  ],
  providers: [BaseSemanalService, SemanaReconciliationService],
  controllers: [BaseSemanalController],
  exports: [BaseSemanalService, SemanaReconciliationService],
})
export class BaseSemanalModule {}
