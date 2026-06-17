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

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Variedad)
    private readonly variedadRepo: Repository<Variedad>,
    @InjectRepository(Color)
    private readonly colorRepo: Repository<Color>,
  ) {}

  async findAll(): Promise<Producto[]> {
    return this.productoRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });
  }

  async create(dto: CreateProductoDto): Promise<Producto> {
    const codigo = dto.codigo.toUpperCase().trim();
    const nombre = dto.nombre.toUpperCase().trim();

    const exists = await this.productoRepo.findOne({
      where: [{ codigo }, { nombre }],
    });
    if (exists) {
      throw new ConflictException(
        exists.codigo === codigo
          ? `Ya existe un producto con el código "${codigo}"`
          : `Ya existe el producto "${nombre}"`,
      );
    }

    const producto = this.productoRepo.create({
      codigo,
      nombre,
      longitud: dto.longitud ?? null,
      tallosPorCaja: dto.tallosPorCaja ?? 400,
    });
    return this.productoRepo.save(producto);
  }

  async update(id: string, dto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.productoRepo.findOne({ where: { id } });
    if (!producto) throw new NotFoundException(`Producto ${id} no encontrado`);

    if (dto.codigo) {
      const codigo = dto.codigo.toUpperCase().trim();
      const exists = await this.productoRepo.findOne({ where: { codigo } });
      if (exists && exists.id !== id) {
        throw new ConflictException(
          `Ya existe un producto con el código "${codigo}"`,
        );
      }
      dto.codigo = codigo;
    }

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
      await this.colorRepo.update(
        colores.map((c) => c.id),
        { activo: false },
      );
      const variedadIds = producto.variedades.map((v) => v.id);
      if (variedadIds.length > 0) {
        await this.variedadRepo.update(variedadIds, { activo: false });
      }
      producto.activo = false;
      await this.productoRepo.save(producto);
    } else {
      await this.productoRepo.remove(producto);
    }
  }
}
