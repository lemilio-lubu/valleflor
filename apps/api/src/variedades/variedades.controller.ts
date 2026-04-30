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
import { VariedadesService } from './variedades.service';
import { CreateVariedadDto } from './dto/create-variedad.dto';
import { UpdateVariedadDto } from './dto/update-variedad.dto';

@UseGuards(JwtAuthGuard)
@Controller('variedades')
export class VariedadesController {
  constructor(private readonly variedadesService: VariedadesService) {}

  @Get()
  findAll(@Query('productoId', ParseUUIDPipe) productoId: string) {
    return this.variedadesService.findAll(productoId);
  }

  @Post()
  create(@Body() dto: CreateVariedadDto, @CurrentUser() user: JwtUser) {
    return this.variedadesService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVariedadDto,
  ) {
    return this.variedadesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.variedadesService.remove(id);
  }
}
