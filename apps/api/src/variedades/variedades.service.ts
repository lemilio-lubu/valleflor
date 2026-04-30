import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variedad } from './variedad.entity';
import { Producto } from '../productos/producto.entity';
import { Responsable } from '../responsables/responsable.entity';
import { UserRole } from '../users/user.entity';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateVariedadDto } from './dto/create-variedad.dto';
import { UpdateVariedadDto } from './dto/update-variedad.dto';

@Injectable()
export class VariedadesService {
  constructor(
    @InjectRepository(Variedad)
    private readonly variedadRepo: Repository<Variedad>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Responsable)
    private readonly responsableRepo: Repository<Responsable>,
  ) {}

  async findAll(productoId: string): Promise<Variedad[]> {
    return this.variedadRepo.find({ where: { productoId } });
  }

  private async verifyProductoAccess(
    productoId: string,
    user: JwtUser,
  ): Promise<Producto> {
    const producto = await this.productoRepo.findOne({
      where: { id: productoId },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${productoId} no encontrado`);
    }

    if (user.role !== UserRole.ADMIN) {
      const responsable = await this.responsableRepo.findOne({
        where: { userId: user.id },
      });
      if (!responsable || responsable.fincaId !== producto.fincaId) {
        throw new ForbiddenException('No tienes acceso a este producto');
      }
    }

    return producto;
  }

  async create(dto: CreateVariedadDto, user: JwtUser): Promise<Variedad> {
    await this.verifyProductoAccess(dto.productoId, user);

    const nombre = dto.nombre.toUpperCase().trim();

    const exists = await this.variedadRepo.findOne({
      where: { nombre, productoId: dto.productoId },
    });
    if (exists) {
      throw new ConflictException(
        `Ya existe la variedad "${nombre}" en este producto`,
      );
    }

    const variedad = this.variedadRepo.create({
      nombre,
      productoId: dto.productoId,
    });
    return this.variedadRepo.save(variedad);
  }

  async update(id: string, dto: UpdateVariedadDto): Promise<Variedad> {
    const variedad = await this.variedadRepo.findOne({ where: { id } });
    if (!variedad) throw new NotFoundException(`Variedad ${id} no encontrada`);

    if (dto.nombre) {
      const nombre = dto.nombre.toUpperCase().trim();
      const exists = await this.variedadRepo.findOne({
        where: { nombre, productoId: variedad.productoId },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException(
          `Ya existe la variedad "${nombre}" en este producto`,
        );
      }
      dto.nombre = nombre;
    }

    Object.assign(variedad, dto);
    return this.variedadRepo.save(variedad);
  }

  async remove(id: string): Promise<void> {
    const variedad = await this.variedadRepo.findOne({ where: { id } });
    if (!variedad) throw new NotFoundException(`Variedad ${id} no encontrada`);
    await this.variedadRepo.remove(variedad);
  }
}
