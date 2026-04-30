import { Controller, Get, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VentasService } from './ventas.service';

@UseGuards(JwtAuthGuard)
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  /** GET /ventas?fincaId=uuid → consolidado histórico de ventas por color */
  @Get()
  findByFinca(@Query('fincaId', ParseUUIDPipe) fincaId: string) {
    return this.ventasService.findByFinca(fincaId);
  }
}
