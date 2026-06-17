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
  findAll(
    @Query('fincaId', ParseUUIDPipe) fincaId: string,
    @CurrentUser() user: JwtUser,
    @Query('incluirInactivos') incluirInactivos?: string,
  ) {
    return this.productosService.findAll(
      fincaId,
      user,
      incluirInactivos === 'true',
    );
  }

  @Post()
  create(@Body() dto: CreateProductoDto, @CurrentUser() user: JwtUser) {
    return this.productosService.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductoDto,
  ) {
    return this.productosService.update(id, dto);
  }

  @Patch(':id/baja')
  darDeBaja(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('motivoBaja') motivoBaja: string,
  ) {
    return this.productosService.darDeBaja(id, motivoBaja);
  }

  @Patch(':id/alta')
  darDeAlta(@Param('id', ParseUUIDPipe) id: string) {
    return this.productosService.darDeAlta(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productosService.remove(id);
  }
}
