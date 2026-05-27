import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ConsolidadoService } from './consolidado.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('consolidado')
export class ConsolidadoController {
  constructor(private readonly consolidadoService: ConsolidadoService) {}

  /**
   * GET /consolidado/diario?semana=19&anio=2026
   * Retorna el total consolidado de la plantilla diaria para la semana indicada.
   */
  @Get('diario')
  getDiario(
    @Query('semana', new ParseIntPipe({ optional: true })) semana?: number,
    @Query('anio', new ParseIntPipe({ optional: true })) anio?: number,
    @Query('fincaId') fincaId?: string,
  ) {
    return this.consolidadoService.getDiario(semana, anio, fincaId);
  }

  /**
   * GET /consolidado/semanal?semanaInicio=19&semanaFin=29&anio=2026
   * Retorna el total acumulado de la plantilla semanal para el rango indicado.
   */
  @Get('semanal')
  getSemanal(
    @Query('semanaInicio', new ParseIntPipe({ optional: true })) semanaInicio?: number,
    @Query('semanaFin', new ParseIntPipe({ optional: true })) semanaFin?: number,
    @Query('anio', new ParseIntPipe({ optional: true })) anio?: number,
    @Query('fincaId') fincaId?: string,
  ) {
    return this.consolidadoService.getSemanal(semanaInicio, semanaFin, anio, fincaId);
  }
}
