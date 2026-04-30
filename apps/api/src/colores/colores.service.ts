import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Color } from './color.entity';
import { Variedad } from '../variedades/variedad.entity';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';

@Injectable()
export class ColoresService {
  constructor(
    @InjectRepository(Color)
    private readonly colorRepo: Repository<Color>,
    @InjectRepository(Variedad)
    private readonly variedadRepo: Repository<Variedad>,
  ) {}

  async findAll(variedadId: string): Promise<Color[]> {
    return this.colorRepo.find({ where: { variedadId } });
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
    await this.colorRepo.remove(color);
  }
}
