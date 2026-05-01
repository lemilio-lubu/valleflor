import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Finca } from './finca.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ResponsableProducto } from '../responsables/responsable-producto.entity';
import { Producto } from '../productos/producto.entity';
import { User } from '../users/user.entity';
import { FincasService } from './fincas.service';
import { FincasController } from './fincas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Finca, Responsable, ResponsableProducto, Producto, User])],
  providers: [FincasService],
  controllers: [FincasController],
  exports: [FincasService],
})
export class FincasModule {}
