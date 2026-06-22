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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user.type';
import { ColoresService } from './colores.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';

@UseGuards(JwtAuthGuard)
@Controller('colores')
export class ColoresController {
  constructor(private readonly coloresService: ColoresService) {}

  @Get()
  findAll(
    @Query('variedadId', new ParseUUIDPipe({ optional: true })) variedadId?: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.coloresService.findAll(variedadId, incluirInactivos === 'true');
  }

  @Post()
  create(@Body() dto: CreateColorDto, @CurrentUser() user: JwtUser) {
    return this.coloresService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateColorDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.coloresService.update(id, dto, user);
  }

  @Patch(':id/baja')
  darDeBaja(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('motivoBaja') motivoBaja: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.coloresService.darDeBaja(id, motivoBaja, user);
  }

  @Patch(':id/alta')
  darDeAlta(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.coloresService.darDeAlta(id, user);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coloresService.remove(id);
  }
}
