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
import { Variedad } from '../variedades/variedad.entity';
import { Color } from '../colores/color.entity';
import { Responsable } from '../responsables/responsable.entity';
import { UserRole } from '../users/user.entity';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { SemanaReconciliationService } from '../base-semanal/semana-reconciliation.service';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Variedad)
    private readonly variedadRepo: Repository<Variedad>,
    @InjectRepository(Color)
    private readonly colorRepo: Repository<Color>,
    @InjectRepository(Responsable)
    private readonly responsableRepo: Repository<Responsable>,
    private readonly reconciliationService: SemanaReconciliationService,
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

  async findAll(
    fincaId: string,
    user: JwtUser,
    incluirInactivos = false,
  ): Promise<Producto[]> {
    if (user.role !== UserRole.ADMIN) {
      const responsable = await this.getResponsable(user.id);
      if (responsable.fincaId !== fincaId) {
        throw new ForbiddenException('No tienes acceso a esta finca');
      }
    }
    const where = incluirInactivos ? { fincaId } : { fincaId, activo: true };
    return this.productoRepo.find({ where });
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

  async darDeBaja(id: string, motivoBaja: string): Promise<Producto> {
    const producto = await this.productoRepo.findOne({
      where: { id },
      relations: ['variedades', 'variedades.colores'],
    });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);

    const colorIds = producto.variedades
      .flatMap((v) => v.colores ?? [])
      .map((c) => c.id);
    const variedadIds = producto.variedades.map((v) => v.id);

    if (colorIds.length > 0) {
      await this.colorRepo.update(colorIds, { activo: false });
    }
    if (variedadIds.length > 0) {
      await this.variedadRepo.update(variedadIds, { activo: false });
    }
    producto.activo = false;
    producto.motivoBaja = motivoBaja ?? null;
    await this.productoRepo.save(producto);

    // Reversible: conserva las asignaciones, solo limpia las semanas vivas.
    await this.reconciliationService.reconcileColores(colorIds);
    return producto;
  }

  async darDeAlta(id: string): Promise<Producto> {
    const producto = await this.productoRepo.findOne({
      where: { id },
      relations: ['finca', 'variedades', 'variedades.colores'],
    });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);
    if (producto.finca && !producto.finca.activo) {
      throw new BadRequestException(
        'La finca está dada de baja; reactívala primero',
      );
    }

    const colorIds = producto.variedades
      .flatMap((v) => v.colores ?? [])
      .map((c) => c.id);
    const variedadIds = producto.variedades.map((v) => v.id);

    if (colorIds.length > 0) {
      await this.colorRepo.update(colorIds, { activo: true });
    }
    if (variedadIds.length > 0) {
      await this.variedadRepo.update(variedadIds, { activo: true });
    }
    producto.activo = true;
    producto.motivoBaja = null;
    await this.productoRepo.save(producto);

    await this.reconciliationService.reconcileColores(colorIds);
    return producto;
  }

  async remove(id: string): Promise<void> {
    const producto = await this.productoRepo.findOne({
      where: { id },
      relations: ['variedades', 'variedades.colores'],
    });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);

    const colores = producto.variedades.flatMap((v) => v.colores ?? []);
    const hasData = colores.length > 0;

    if (hasData) {
      // Cascade soft-delete: producto → variedades → colores
      const colorIds = colores.map((c) => c.id);
      await this.colorRepo.update(colorIds, { activo: false });
      const variedadIds = producto.variedades.map((v) => v.id);
      if (variedadIds.length > 0) {
        await this.variedadRepo.update(variedadIds, { activo: false });
      }
      producto.activo = false;
      await this.productoRepo.save(producto);
      // Reflejar la baja en las semanas actual y futuras de los responsables.
      await this.reconciliationService.reconcileColoresDadosDeBaja(colorIds);
    } else {
      await this.productoRepo.remove(producto);
    }
  }
}
