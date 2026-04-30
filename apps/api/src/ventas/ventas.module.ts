import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';
import { VentasService } from './ventas.service';
import { VentasController } from './ventas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BaseSemanal])],
  providers: [VentasService],
  controllers: [VentasController],
})
export class VentasModule {}
