import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistroDiario } from './registro-diario.entity';
import { RegistrosService } from './registros.service';
import { RegistrosController } from './registros.controller';
import { BaseSemanalModule } from '../base-semanal/base-semanal.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RegistroDiario]),
    BaseSemanalModule,
  ],
  providers: [RegistrosService],
  controllers: [RegistrosController],
  exports: [RegistrosService],
})
export class RegistrosModule {}
