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
  findAll(@Query('variedadId', ParseUUIDPipe) variedadId: string) {
    return this.coloresService.findAll(variedadId);
  }

  @Post()
  create(@Body() dto: CreateColorDto, @CurrentUser() _user: JwtUser) {
    return this.coloresService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateColorDto,
  ) {
    return this.coloresService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.coloresService.remove(id);
  }
}
