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

@UseGuards(JwtAuthGuard)
@Controller('consolidado')
export class ConsolidadoController {
  constructor(private readonly consolidadoService: ConsolidadoService) {}

  @Get('diario')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  getDiario(
    @Query('fincaId') fincaId?: string,
    @Query('responsableId') responsableId?: string,
    @Query('semana', new ParseIntPipe({ optional: true })) semana?: number,
    @Query('anio', new ParseIntPipe({ optional: true })) anio?: number,
  ) {
    return this.consolidadoService.getDiario(fincaId, responsableId, semana, anio);
  }

  @Get('semanal')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  getSemanal(
    @Query('fincaId') fincaId?: string,
    @Query('responsableId') responsableId?: string,
    @Query('semana', new ParseIntPipe({ optional: true })) semana?: number,
    @Query('anio', new ParseIntPipe({ optional: true })) anio?: number,
  ) {
    return this.consolidadoService.getSemanal(fincaId, responsableId, semana, anio);
  }
}
