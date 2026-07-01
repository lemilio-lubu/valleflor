import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { ConsolidadoService } from './consolidado.service';

/**
 * El ValidationPipe global (transform: true) corre antes que cualquier pipe
 * de parámetro y castea con `+value` los query params tipados `number`,
 * convirtiendo un parámetro ausente (`undefined`) en `NaN` antes de que
 * ParseIntPipe({ optional: true }) pueda detectarlo como ausente. Por eso
 * estas rutas reciben el valor crudo como `string` y lo parsean a mano.
 */
function parseOptionalInt(value: string | undefined, paramName: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  if (!/^-?\d+$/.test(value)) {
    throw new BadRequestException(`Validation failed (numeric string is expected) for "${paramName}"`);
  }
  return parseInt(value, 10);
}

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
    @Query('semana') semanaRaw?: string,
    @Query('anio') anioRaw?: string,
  ) {
    const semana = parseOptionalInt(semanaRaw, 'semana');
    const anio = parseOptionalInt(anioRaw, 'anio');
    return this.consolidadoService.getDiario(semana, anio);
  }

  /**
   * GET /consolidado/semanal?semanaInicio=19&semanaFin=29&anio=2026
   * Retorna el total acumulado de la plantilla semanal para el rango indicado.
   */
  @Get('semanal')
  getSemanal(
    @Query('semanaInicio') semanaInicioRaw?: string,
    @Query('semanaFin') semanaFinRaw?: string,
    @Query('anio') anioRaw?: string,
  ) {
    const semanaInicio = parseOptionalInt(semanaInicioRaw, 'semanaInicio');
    const semanaFin = parseOptionalInt(semanaFinRaw, 'semanaFin');
    const anio = parseOptionalInt(anioRaw, 'anio');
    return this.consolidadoService.getSemanal(semanaInicio, semanaFin, anio);
  }

  /**
   * GET /consolidado/participacion-color?semanaInicio=19&semanaFin=29&anio=2026
   * Retorna la participación porcentual de cada color dentro del total de cajas
   * reales del producto para el rango de semanas indicado.
   */
  @Get('participacion-color')
  getParticipacionColor(
    @Query('semanaInicio') semanaInicioRaw?: string,
    @Query('semanaFin') semanaFinRaw?: string,
    @Query('anio') anioRaw?: string,
  ) {
    const semanaInicio = parseOptionalInt(semanaInicioRaw, 'semanaInicio');
    const semanaFin = parseOptionalInt(semanaFinRaw, 'semanaFin');
    const anio = parseOptionalInt(anioRaw, 'anio');
    return this.consolidadoService.getParticipacionColor(semanaInicio, semanaFin, anio);
  }
}
