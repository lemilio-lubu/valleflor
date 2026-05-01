import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Semana } from './semana.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { Color } from '../colores/color.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ResponsableProducto } from '../responsables/responsable-producto.entity';
import { SemanasService } from './semanas.service';
import { SemanasController } from './semanas.controller';
import { ConfiguracionModule } from '../configuracion/configuracion.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Semana, RegistroDiario, Color, Responsable, ResponsableProducto]),
    ConfiguracionModule,
  ],
  providers: [SemanasService],
  controllers: [SemanasController],
  exports: [SemanasService],
})
export class SemanasModule {}
