import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto } from './producto.entity';
import { Variedad } from '../variedades/variedad.entity';
import { Color } from '../colores/color.entity';
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
    private readonly reconciliationService: SemanaReconciliationService,
  ) {}

  async findAll(
    incluirInactivos = false,
  ): Promise<(Producto & { eliminable: boolean })[]> {
    const productos = await this.productoRepo.find({
      where: incluirInactivos ? {} : { activo: true },
      order: { nombre: 'ASC' },
    });
    if (productos.length === 0) return [];

    // `eliminable` = el DELETE haría borrado físico (sin datos asociados).
    // Mismo criterio que remove(): el producto NO tiene colores colgando.
    const ids = productos.map((p) => p.id);
    const rows = await this.variedadRepo
      .createQueryBuilder('v')
      .innerJoin('v.colores', 'c')
      .select('v.producto_id', 'productoId')
      .where('v.producto_id IN (:...ids)', { ids })
      .groupBy('v.producto_id')
      .getRawMany<{ productoId: string }>();
    const conDatos = new Set(rows.map((r) => r.productoId));

    return productos.map((p) =>
      Object.assign(p, { eliminable: !conDatos.has(p.id) }),
    );
  }

  async create(dto: CreateProductoDto): Promise<Producto> {
    const nombre = dto.nombre.toUpperCase().trim();

    const exists = await this.productoRepo.findOne({ where: { nombre } });
    if (exists) {
      throw new ConflictException(`Ya existe el producto "${nombre}"`);
    }

    const producto = this.productoRepo.create({ nombre });
    return this.productoRepo.save(producto);
  }

  async update(id: string, dto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.productoRepo.findOne({ where: { id } });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);

    if (dto.nombre) {
      const nombre = dto.nombre.toUpperCase().trim();
      const exists = await this.productoRepo.findOne({ where: { nombre } });
      if (exists && exists.id !== id) {
        throw new ConflictException(`Ya existe el producto "${nombre}"`);
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
      relations: ['variedades', 'variedades.colores'],
    });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);

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
