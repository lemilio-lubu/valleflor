import {
  Controller,
  Get,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { AuditoriaService, FiltrosCambios } from './auditoria.service';
import { AuditoriaPdfService } from './auditoria-pdf.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('auditoria')
export class AuditoriaController {
  constructor(
    private readonly auditoriaService: AuditoriaService,
    private readonly pdfService: AuditoriaPdfService,
  ) {}

  /** GET /auditoria/cambios — historial de cambios por módulo con filtros. */
  @Get('cambios')
  cambios(
    @Query('modulo') modulo?: string,
    @Query('responsable') responsable?: string,
    @Query('accion') accion?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.auditoriaService.consultarCambios(
      this.parseFiltros(modulo, responsable, accion, desde, hasta),
    );
  }

  /** GET /auditoria/accesos — inicios de sesión (apartado propio). */
  @Get('accesos')
  accesos() {
    return this.auditoriaService.consultarAccesos();
  }

  /** GET /auditoria/cambios/pdf — descarga del historial respetando los filtros. */
  @Get('cambios/pdf')
  async pdf(
    @Res({ passthrough: true }) res: Response,
    @Query('modulo') modulo?: string,
    @Query('responsable') responsable?: string,
    @Query('accion') accion?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ): Promise<StreamableFile> {
    const filtros = this.parseFiltros(modulo, responsable, accion, desde, hasta);
    const movimientos = await this.auditoriaService.consultarCambios(filtros);
    const buffer = await this.pdfService.generar(movimientos, { modulo });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="auditoria-${modulo ?? 'todos'}.pdf"`,
    });
    return new StreamableFile(buffer);
  }

  private parseFiltros(
    modulo?: string,
    responsable?: string,
    accion?: string,
    desde?: string,
    hasta?: string,
  ): FiltrosCambios {
    return {
      modulo,
      responsable,
      accion,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
    };
  }
}
