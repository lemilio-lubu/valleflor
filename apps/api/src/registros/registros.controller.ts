import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegistrosService } from './registros.service';
import { UpdateRegistroDto } from './dto/update-registro.dto';
import { UpdateDivisorDto } from './dto/update-divisor.dto';
import { BulkUpdateDto } from './dto/bulk-update.dto';

@UseGuards(JwtAuthGuard)
@Controller('registros')
export class RegistrosController {
  constructor(private readonly registrosService: RegistrosService) {}

  /** GET /registros?semanaId=uuid → todos los registros de una semana */
  @Get()
  findBySemana(@Query('semanaId', ParseUUIDPipe) semanaId: string) {
    return this.registrosService.findBySemana(semanaId);
  }

  /**
   * POST /registros/bulk-update → actualizar múltiples registros a la vez.
   * Debe ir ANTES de :id para que NestJS no lo confunda con un UUID param.
   */
  @Post('bulk-update')
  bulkUpdate(@Body() dto: BulkUpdateDto) {
    return this.registrosService.bulkUpdate(dto.updates);
  }

  /** PATCH /registros/:id → actualizar cajas (y opcionalmente divisor_tallos) */
  @Patch(':id')
  updateCajas(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRegistroDto,
  ) {
    return this.registrosService.updateCajas(id, dto);
  }

  /** PATCH /registros/:id/divisor → actualizar solo divisor_tallos */
  @Patch(':id/divisor')
  updateDivisor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDivisorDto,
  ) {
    return this.registrosService.updateDivisor(id, dto);
  }
}
