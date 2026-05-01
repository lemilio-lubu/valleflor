import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { JwtUser } from '../auth/types/jwt-user.type';
import { FincasService } from './fincas.service';
import { CreateFincaDto } from './dto/create-finca.dto';
import { UpdateFincaDto } from './dto/update-finca.dto';
import { AssignResponsableDto } from './dto/assign-responsable.dto';

@UseGuards(JwtAuthGuard)
@Controller('fincas')
export class FincasController {
  constructor(private readonly fincasService: FincasService) {}

  @Get()
  findAll(@CurrentUser() user: JwtUser) {
    return this.fincasService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.fincasService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateFincaDto, @CurrentUser() user: JwtUser) {
    return this.fincasService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFincaDto) {
    return this.fincasService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fincasService.remove(id);
  }

  @Get(':id/responsables')
  findResponsables(@Param('id', ParseUUIDPipe) id: string) {
    return this.fincasService.findResponsables(id);
  }

  @Post(':id/responsables')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  assignResponsable(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignResponsableDto) {
    return this.fincasService.assignResponsable(id, dto);
  }

  @Delete(':id/responsables/:responsableId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  removeResponsable(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('responsableId', ParseUUIDPipe) responsableId: string,
  ) {
    return this.fincasService.removeResponsable(id, responsableId);
  }

  @Get(':fincaId/responsables/:responsableId/productos')
  getProductosResponsable(
    @Param('fincaId', ParseUUIDPipe) fincaId: string,
    @Param('responsableId', ParseUUIDPipe) responsableId: string,
  ) {
    return this.fincasService.getProductosResponsable(fincaId, responsableId);
  }

  @Post(':fincaId/responsables/:responsableId/productos')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  setProductosResponsable(
    @Param('fincaId', ParseUUIDPipe) fincaId: string,
    @Param('responsableId', ParseUUIDPipe) responsableId: string,
    @Body() body: { productoIds: string[] },
  ) {
    return this.fincasService.setProductosResponsable(fincaId, responsableId, body.productoIds);
  }
}
