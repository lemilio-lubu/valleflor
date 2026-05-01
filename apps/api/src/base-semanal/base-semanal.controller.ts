import {
  Controller,
  DefaultValuePipe,
  Get,
  Patch,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { BaseSemanalService } from './base-semanal.service';

@UseGuards(JwtAuthGuard)
@Controller('base-semanal')
export class BaseSemanalController {
  constructor(private readonly baseSemanalService: BaseSemanalService) {}

  /**
   * GET /base-semanal/semana-actual?fincaId=uuid
   * Debe ir ANTES de la ruta raíz para que NestJS no la confunda con un param.
   */
  @Get('semana-actual')
  findSemanaActual(
    @Query('fincaId', ParseUUIDPipe) fincaId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.baseSemanalService.findSemanaActual(fincaId, user.id);
  }

  /**
   * GET /base-semanal?fincaId=uuid&semanas=10
   */
  @Get()
  findMatriz(
    @Query('fincaId', ParseUUIDPipe) fincaId: string,
    @Query('semanas', new DefaultValuePipe(10), ParseIntPipe) semanas: number,
    @CurrentUser() user: JwtUser,
  ) {
    return this.baseSemanalService.findMatriz(fincaId, semanas, user.id);
  }

  @Patch('estimar')
  upsertEstimacion(
    @Query('colorId', ParseUUIDPipe) colorId: string,
    @Query('numeroSemana', ParseIntPipe) numeroSemana: number,
    @Query('anio', ParseIntPipe) anio: number,
    @Query('cajasEstimadas') cajasEstimadas: number,
    @Query('divisor') divisor: number,
  ) {
    return this.baseSemanalService.upsertEstimacion(colorId, numeroSemana, anio, Number(cajasEstimadas), Number(divisor));
  }
}
