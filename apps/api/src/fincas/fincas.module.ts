import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Finca } from './finca.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';
import { Producto } from '../productos/producto.entity';
import { Color } from '../colores/color.entity';
import { User } from '../users/user.entity';
import { FincasService } from './fincas.service';
import { FincasController } from './fincas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Finca, Responsable, ResponsableColor, Producto, Color, User])],
  providers: [FincasService],
  controllers: [FincasController],
  exports: [FincasService],
})
export class FincasModule {}
