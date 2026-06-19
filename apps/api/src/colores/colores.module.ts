import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Color } from './color.entity';
import { Variedad } from '../variedades/variedad.entity';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { ColoresService } from './colores.service';
import { ColoresController } from './colores.controller';
import { BaseSemanalModule } from '../base-semanal/base-semanal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Color, Variedad, BaseSemanal, RegistroDiario]),
    BaseSemanalModule,
  ],
  providers: [ColoresService],
  controllers: [ColoresController],
  exports: [ColoresService],
})
export class ColoresModule {}
