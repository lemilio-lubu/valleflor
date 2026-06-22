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
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@UseGuards(JwtAuthGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  findAll(@Query('incluirInactivos') incluirInactivos?: string) {
    return this.productosService.findAll(incluirInactivos === 'true');
  }

  @Post()
  create(@Body() dto: CreateProductoDto, @CurrentUser() actor: JwtUser) {
    return this.productosService.create(dto, actor);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductoDto,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.productosService.update(id, dto, actor);
  }

  @Patch(':id/baja')
  darDeBaja(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('motivoBaja') motivoBaja: string,
    @CurrentUser() actor: JwtUser,
  ) {
    return this.productosService.darDeBaja(id, motivoBaja, actor);
  }

  @Patch(':id/alta')
  darDeAlta(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtUser) {
    return this.productosService.darDeAlta(id, actor);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productosService.remove(id);
  }
}
