import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseSemanal } from './base-semanal.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { Semana } from '../semanas/semana.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';
import { BaseSemanalService } from './base-semanal.service';
import { BaseSemanalController } from './base-semanal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BaseSemanal, RegistroDiario, Semana, Responsable, ResponsableColor])],
  providers: [BaseSemanalService],
  controllers: [BaseSemanalController],
  exports: [BaseSemanalService],
})
export class BaseSemanalModule {}
