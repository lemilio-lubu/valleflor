import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variedad } from './variedad.entity';
import { Producto } from '../productos/producto.entity';
import { Color } from '../colores/color.entity';
import { CreateVariedadDto } from './dto/create-variedad.dto';
import { UpdateVariedadDto } from './dto/update-variedad.dto';

@Injectable()
export class VariedadesService {
  constructor(
    @InjectRepository(Variedad)
    private readonly variedadRepo: Repository<Variedad>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Color)
    private readonly colorRepo: Repository<Color>,
  ) {}

  async findAll(productoId: string): Promise<Variedad[]> {
    return this.variedadRepo.find({ where: { productoId, activo: true } });
  }

  private async getProductoOrFail(productoId: string): Promise<Producto> {
    const producto = await this.productoRepo.findOne({
      where: { id: productoId },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${productoId} no encontrado`);
    }
    return producto;
  }

  async create(dto: CreateVariedadDto): Promise<Variedad> {
    await this.getProductoOrFail(dto.productoId);

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
    const variedad = await this.variedadRepo.findOne({
      where: { id },
      relations: ['colores'],
    });
    if (!variedad) throw new NotFoundException(`Variedad ${id} no encontrada`);

    const colores = variedad.colores ?? [];

    if (colores.length > 0) {
      // Cascade soft-delete: variedad → colores
      await this.colorRepo.update(
        colores.map((c) => c.id),
        { activo: false },
      );
      variedad.activo = false;
      await this.variedadRepo.save(variedad);
    } else {
      await this.variedadRepo.remove(variedad);
    }
  }
}
