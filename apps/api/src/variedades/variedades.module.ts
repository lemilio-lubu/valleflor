import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Variedad } from './variedad.entity';
import { Producto } from '../productos/producto.entity';
import { Responsable } from '../responsables/responsable.entity';
import { VariedadesService } from './variedades.service';
import { VariedadesController } from './variedades.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Variedad, Producto, Responsable])],
  providers: [VariedadesService],
  controllers: [VariedadesController],
  exports: [VariedadesService],
})
export class VariedadesModule {}
