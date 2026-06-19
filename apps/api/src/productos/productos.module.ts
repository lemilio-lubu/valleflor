import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './producto.entity';
import { Variedad } from '../variedades/variedad.entity';
import { Color } from '../colores/color.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { BaseSemanalModule } from '../base-semanal/base-semanal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, Variedad, Color, Responsable]),
    BaseSemanalModule,
  ],
  providers: [ProductosService],
  controllers: [ProductosController],
  exports: [ProductosService],
})
export class ProductosModule {}
