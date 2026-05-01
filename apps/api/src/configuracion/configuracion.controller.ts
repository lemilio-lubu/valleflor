import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/user.entity';
import { ConfiguracionService } from './configuracion.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly configuracionService: ConfiguracionService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.RESPONSABLE)
  get() {
    return this.configuracionService.get();
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  update(@Body() body: { tallosPorCaja: number }) {
    return this.configuracionService.update(body.tallosPorCaja);
  }
}
