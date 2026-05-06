import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsolidadoController } from './consolidado.controller';
import { ConsolidadoService } from './consolidado.service';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegistroDiario, BaseSemanal])],
  controllers: [ConsolidadoController],
  providers: [ConsolidadoService],
})
export class ConsolidadoModule {}
