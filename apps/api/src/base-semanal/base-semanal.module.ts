import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseSemanal } from './base-semanal.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { Semana } from '../semanas/semana.entity';
import { BaseSemanalService } from './base-semanal.service';
import { BaseSemanalController } from './base-semanal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BaseSemanal, RegistroDiario, Semana])],
  providers: [BaseSemanalService],
  controllers: [BaseSemanalController],
  exports: [BaseSemanalService],
})
export class BaseSemanalModule {}
