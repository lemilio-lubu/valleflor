import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { Responsable } from '../responsables/responsable.entity';
import { UserRole } from '../users/user.entity';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Responsable)
    private readonly responsableRepo: Repository<Responsable>,
  ) {}

  private async getResponsable(userId: string): Promise<Responsable> {
    const responsable = await this.responsableRepo.findOne({
      where: { userId },
    });
    if (!responsable) {
      throw new ForbiddenException('No eres responsable de ninguna finca');
    }
    return responsable;
  }

  async findAll(fincaId: string, user: JwtUser): Promise<Producto[]> {
    if (user.role !== UserRole.ADMIN) {
      const responsable = await this.getResponsable(user.id);
      if (responsable.fincaId !== fincaId) {
        throw new ForbiddenException('No tienes acceso a esta finca');
      }
    }
    return this.productoRepo.find({ where: { fincaId } });
  }

  async create(dto: CreateProductoDto, user: JwtUser): Promise<Producto> {
    let fincaId: string;

    if (user.role === UserRole.ADMIN) {
      if (!dto.fincaId) {
        throw new BadRequestException('fincaId es requerido para administradores');
      }
      fincaId = dto.fincaId;
    } else {
      const responsable = await this.getResponsable(user.id);
      fincaId = responsable.fincaId;
    }

    const nombre = dto.nombre.toUpperCase().trim();

    const exists = await this.productoRepo.findOne({
      where: { nombre, fincaId },
    });
    if (exists) {
      throw new ConflictException(
        `Ya existe el producto "${nombre}" en esta finca`,
      );
    }

    const producto = this.productoRepo.create({ nombre, fincaId });
    return this.productoRepo.save(producto);
  }

  async update(id: string, dto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.productoRepo.findOne({ where: { id } });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);

    if (dto.nombre) {
      const nombre = dto.nombre.toUpperCase().trim();
      const exists = await this.productoRepo.findOne({
        where: { nombre, fincaId: producto.fincaId },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException(
          `Ya existe el producto "${nombre}" en esta finca`,
        );
      }
      dto.nombre = nombre;
    }

    Object.assign(producto, dto);
    return this.productoRepo.save(producto);
  }

  async remove(id: string): Promise<void> {
    const producto = await this.productoRepo.findOne({ where: { id } });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);
    await this.productoRepo.remove(producto);
  }
}
