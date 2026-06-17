import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from './color.entity';
import { Variedad } from '../variedades/variedad.entity';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';

@Injectable()
export class ColoresService {
  constructor(
    @InjectRepository(Color)
    private readonly colorRepo: Repository<Color>,
    @InjectRepository(Variedad)
    private readonly variedadRepo: Repository<Variedad>,
    @InjectRepository(BaseSemanal)
    private readonly baseSemanalRepo: Repository<BaseSemanal>,
    @InjectRepository(RegistroDiario)
    private readonly registroRepo: Repository<RegistroDiario>,
  ) {}

  async findAll(variedadId?: string): Promise<Color[]> {
    if (variedadId) {
      return this.colorRepo.find({ where: { variedadId, activo: true } });
    }
    return this.colorRepo.find({
      where: { activo: true },
      relations: ['variedad', 'variedad.producto'],
      order: {
        variedad: {
          producto: {
            nombre: 'ASC'
          },
          nombre: 'ASC'
        },
        nombre: 'ASC'
      }
    });
  }

  async create(dto: CreateColorDto): Promise<Color> {
    const variedad = await this.variedadRepo.findOne({
      where: { id: dto.variedadId },
    });
    if (!variedad) {
      throw new NotFoundException(`Variedad ${dto.variedadId} no encontrada`);
    }

    const nombre = dto.nombre.toUpperCase().trim();

    const exists = await this.colorRepo.findOne({
      where: { nombre, variedadId: dto.variedadId },
    });
    if (exists) {
      throw new ConflictException(
        `Ya existe el color "${nombre}" en esta variedad`,
      );
    }

    const color = this.colorRepo.create({ nombre, variedadId: dto.variedadId });
    return this.colorRepo.save(color);
  }

  async update(id: string, dto: UpdateColorDto): Promise<Color> {
    const color = await this.colorRepo.findOne({ where: { id } });
    if (!color) throw new NotFoundException(`Color ${id} no encontrado`);

    if (dto.nombre) {
      const nombre = dto.nombre.toUpperCase().trim();
      const exists = await this.colorRepo.findOne({
        where: { nombre, variedadId: color.variedadId },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException(
          `Ya existe el color "${nombre}" en esta variedad`,
        );
      }
      dto.nombre = nombre;
    }

    Object.assign(color, dto);
    return this.colorRepo.save(color);
  }

  async remove(id: string): Promise<void> {
    const color = await this.colorRepo.findOne({ where: { id } });
    if (!color) throw new NotFoundException(`Color ${id} no encontrado`);

    // Check if there are any related records that would prevent hard delete
    const hasBase = await this.baseSemanalRepo.count({ where: { colorId: id } });
    const hasRegistros = hasBase === 0
      ? await this.registroRepo.count({ where: { colorId: id } })
      : 1;

    if (hasBase > 0 || hasRegistros > 0) {
      // Has historical data — soft delete
      color.activo = false;
      await this.colorRepo.save(color);
    } else {
      // No data — safe to hard delete
      await this.colorRepo.remove(color);
    }
  }
}
