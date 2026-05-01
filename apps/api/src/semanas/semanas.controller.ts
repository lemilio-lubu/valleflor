import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { SemanasService } from './semanas.service';
import { CreateSemanaDto } from './dto/create-semana.dto';

@UseGuards(JwtAuthGuard)
@Controller('semanas')
export class SemanasController {
  constructor(private readonly semanasService: SemanasService) {}

  /** POST /semanas → crear semana y generar registros diarios */
  @Post()
  create(@Body() dto: CreateSemanaDto, @CurrentUser() user: JwtUser) {
    return this.semanasService.create(dto, user);
  }

  /** GET /semanas → lista paginada del responsable autenticado */
  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.semanasService.findAll(user, page, limit);
  }

  /** GET /semanas/:id → detalle con registros diarios */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.semanasService.findOne(id);
  }

  /** GET /semanas/:id/plantilla → tabla completa ordenada */
  @Get(':id/plantilla')
  findPlantilla(@Param('id', ParseUUIDPipe) id: string) {
    return this.semanasService.findPlantilla(id);
  }

  /** DELETE /semanas/:id */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.semanasService.remove(id, user);
  }
}
