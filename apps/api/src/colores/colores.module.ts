import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Color } from './color.entity';
import { Variedad } from '../variedades/variedad.entity';
import { ColoresService } from './colores.service';
import { ColoresController } from './colores.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Color, Variedad])],
  providers: [ColoresService],
  controllers: [ColoresController],
  exports: [ColoresService],
})
export class ColoresModule {}
