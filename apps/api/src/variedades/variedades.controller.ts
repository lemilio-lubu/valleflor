import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VariedadesService } from './variedades.service';
import { CreateVariedadDto } from './dto/create-variedad.dto';
import { UpdateVariedadDto } from './dto/update-variedad.dto';

@UseGuards(JwtAuthGuard)
@Controller('variedades')
export class VariedadesController {
  constructor(private readonly variedadesService: VariedadesService) {}

  @Get()
  findAll(
    @Query('productoId', ParseUUIDPipe) productoId: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.variedadesService.findAll(
      productoId,
      incluirInactivos === 'true',
    );
  }

  @Post()
  create(@Body() dto: CreateVariedadDto) {
    return this.variedadesService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariedadDto,
  ) {
    return this.variedadesService.update(id, dto);
  }

  @Patch(':id/baja')
  darDeBaja(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('motivoBaja') motivoBaja: string,
  ) {
    return this.variedadesService.darDeBaja(id, motivoBaja);
  }

  @Patch(':id/alta')
  darDeAlta(@Param('id', ParseUUIDPipe) id: string) {
    return this.variedadesService.darDeAlta(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.variedadesService.remove(id);
  }
}
