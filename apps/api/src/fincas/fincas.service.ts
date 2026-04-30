import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Finca } from './finca.entity';
import { Responsable } from '../responsables/responsable.entity';
import { User, UserRole } from '../users/user.entity';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateFincaDto } from './dto/create-finca.dto';
import { UpdateFincaDto } from './dto/update-finca.dto';
import { AssignResponsableDto } from './dto/assign-responsable.dto';

@Injectable()
export class FincasService {
  constructor(
    @InjectRepository(Finca)
    private readonly fincaRepo: Repository<Finca>,
    @InjectRepository(Responsable)
    private readonly responsableRepo: Repository<Responsable>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAll(user: JwtUser): Promise<Finca[]> {
    if (user.role === UserRole.ADMIN) {
      return this.fincaRepo.find({ relations: ['admin'] });
    }
    const responsable = await this.responsableRepo.findOne({
      where: { userId: user.id },
      relations: ['finca', 'finca.admin'],
    });
    return responsable ? [responsable.finca] : [];
  }

  async findOne(id: string): Promise<Finca> {
    const finca = await this.fincaRepo.findOne({
      where: { id },
      relations: ['admin', 'responsables', 'responsables.user'],
    });
    if (!finca) throw new NotFoundException(`Finca ${id} no encontrada`);
    return finca;
  }

  async create(dto: CreateFincaDto, user: JwtUser): Promise<Finca> {
    const finca = this.fincaRepo.create({ nombre: dto.nombre, ubicacion: dto.ubicacion ?? null, adminId: user.id });
    return this.fincaRepo.save(finca);
  }

  async update(id: string, dto: UpdateFincaDto): Promise<Finca> {
    const finca = await this.findOne(id);
    Object.assign(finca, dto);
    return this.fincaRepo.save(finca);
  }

  async remove(id: string): Promise<void> {
    const finca = await this.fincaRepo.findOne({
      where: { id },
      relations: ['responsables', 'productos'],
    });
    if (!finca) throw new NotFoundException(`Finca ${id} no encontrada`);
    if (finca.responsables?.length) {
      throw new BadRequestException(
        `No se puede eliminar: la finca tiene ${finca.responsables.length} responsable(s) asignado(s). Quítalos primero.`,
      );
    }
    if (finca.productos?.length) {
      throw new BadRequestException(
        `No se puede eliminar: la finca tiene ${finca.productos.length} producto(s) registrado(s). Elimínalos primero.`,
      );
    }
    await this.fincaRepo.remove(finca);
  }

  async findResponsables(fincaId: string): Promise<Responsable[]> {
    await this.findOne(fincaId);
    return this.responsableRepo.find({
      where: { fincaId },
      relations: ['user'],
    });
  }

  async removeResponsable(fincaId: string, responsableId: string): Promise<void> {
    const responsable = await this.responsableRepo.findOne({
      where: { id: responsableId, fincaId },
    });
    if (!responsable) throw new NotFoundException('Responsable no encontrado en esta finca');
    await this.responsableRepo.remove(responsable);
  }

  async assignResponsable(
    fincaId: string,
    dto: AssignResponsableDto,
  ): Promise<Responsable> {
    await this.findOne(fincaId);

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`Usuario ${dto.userId} no encontrado`);
    if (user.role !== UserRole.RESPONSABLE) {
      throw new ForbiddenException('El usuario debe tener rol responsable');
    }

    const existing = await this.responsableRepo.findOne({
      where: { userId: dto.userId },
    });
    if (existing) {
      if (existing.fincaId === fincaId) {
        throw new ConflictException('El usuario ya está asignado a esta finca');
      }
      await this.responsableRepo.update(existing.id, {
        fincaId,
        nombre: dto.nombre.toUpperCase().trim(),
      });
      return this.responsableRepo.findOne({
        where: { id: existing.id },
        relations: ['user'],
      });
    }

    const responsable = this.responsableRepo.create({
      userId: dto.userId,
      fincaId,
      nombre: dto.nombre.toUpperCase().trim(),
    });
    return this.responsableRepo.save(responsable);
  }
}
