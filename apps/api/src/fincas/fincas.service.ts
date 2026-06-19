import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Finca } from './finca.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';
import { Producto } from '../productos/producto.entity';
import { Color } from '../colores/color.entity';
import { User, UserRole } from '../users/user.entity';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateFincaDto } from './dto/create-finca.dto';
import { UpdateFincaDto } from './dto/update-finca.dto';
import { AssignResponsableDto } from './dto/assign-responsable.dto';
import { SemanaReconciliationService } from '../base-semanal/semana-reconciliation.service';

@Injectable()
export class FincasService {
  constructor(
    @InjectRepository(Finca)
    private readonly fincaRepo: Repository<Finca>,
    @InjectRepository(Responsable)
    private readonly responsableRepo: Repository<Responsable>,
    @InjectRepository(ResponsableColor)
    private readonly respColorRepo: Repository<ResponsableColor>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
    @InjectRepository(Color)
    private readonly colorRepo: Repository<Color>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly reconciliationService: SemanaReconciliationService,
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

  async darDeBaja(id: string, motivoBaja: string): Promise<Finca> {
    const finca = await this.fincaRepo.findOne({ where: { id } });
    if (!finca) throw new NotFoundException(`Finca ${id} no encontrada`);
    finca.activo = false;
    finca.motivoBaja = motivoBaja;
    return this.fincaRepo.save(finca);
  }

  async darDeAlta(id: string): Promise<Finca> {
    const finca = await this.fincaRepo.findOne({ where: { id } });
    if (!finca) throw new NotFoundException(`Finca ${id} no encontrada`);
    finca.activo = true;
    finca.motivoBaja = null;
    return this.fincaRepo.save(finca);
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
    await this.responsableRepo.softRemove(responsable);
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
      withDeleted: true,
    });
    if (existing) {
      if (existing.fincaId === fincaId) {
        if (existing.deletedAt) {
          await this.responsableRepo.recover(existing);
          return this.responsableRepo.findOne({
            where: { id: existing.id },
            relations: ['user'],
          });
        }
        throw new ConflictException('El usuario ya está asignado a esta finca');
      }
      if (existing.deletedAt) {
        await this.responsableRepo.recover(existing);
      }
      await this.responsableRepo.update(existing.id, { fincaId });
      return this.responsableRepo.findOne({
        where: { id: existing.id },
        relations: ['user'],
      });
    }

    const responsable = this.responsableRepo.create({
      userId: dto.userId,
      fincaId,
    });
    return this.responsableRepo.save(responsable);
  }

  async getProductosResponsable(fincaId: string, responsableId: string): Promise<Producto[]> {
    const responsable = await this.responsableRepo.findOne({ where: { id: responsableId, fincaId } });
    if (!responsable) throw new NotFoundException('Responsable no encontrado en esta finca');
    const assignments = await this.respColorRepo.find({
      where: { responsableId },
      relations: ['color', 'color.variedad', 'color.variedad.producto'],
    });
    const productosMap = new Map<string, Producto>();
    for (const a of assignments) {
      if (a.color && a.color.variedad && a.color.variedad.producto) {
        productosMap.set(a.color.variedad.producto.id, a.color.variedad.producto);
      }
    }
    return Array.from(productosMap.values());
  }

  async getColorIdsResponsable(fincaId: string, responsableId: string): Promise<string[]> {
    const responsable = await this.responsableRepo.findOne({ where: { id: responsableId, fincaId } });
    if (!responsable) throw new NotFoundException('Responsable no encontrado en esta finca');
    const assignments = await this.respColorRepo.find({ where: { responsableId } });
    return assignments.map((a) => a.colorId);
  }

  /**
   * Asignación granular (F4): expande productos / variedades / colores a los
   * color_id activos correspondientes y reemplaza las asignaciones del responsable.
   */
  async setAsignacionesResponsable(
    fincaId: string,
    responsableId: string,
    seleccion: {
      productoIds?: string[];
      variedadIds?: string[];
      colorIds?: string[];
    },
  ): Promise<Producto[]> {
    const responsable = await this.responsableRepo.findOne({ where: { id: responsableId, fincaId } });
    if (!responsable) throw new NotFoundException('Responsable no encontrado en esta finca');

    const colorIdSet = new Set<string>();

    if (seleccion.colorIds?.length) {
      const colores = await this.colorRepo.find({
        where: { id: In(seleccion.colorIds), activo: true },
      });
      colores.forEach((c) => colorIdSet.add(c.id));
    }
    if (seleccion.variedadIds?.length) {
      const colores = await this.colorRepo.find({
        where: { variedadId: In(seleccion.variedadIds), activo: true },
      });
      colores.forEach((c) => colorIdSet.add(c.id));
    }
    if (seleccion.productoIds?.length) {
      const colores = await this.colorRepo
        .createQueryBuilder('color')
        .innerJoin('color.variedad', 'variedad')
        .where('variedad.productoId IN (:...productoIds)', {
          productoIds: seleccion.productoIds,
        })
        .andWhere('color.activo = true')
        .getMany();
      colores.forEach((c) => colorIdSet.add(c.id));
    }

    await this.respColorRepo.delete({ responsableId });
    if (colorIdSet.size > 0) {
      const records = [...colorIdSet].map((colorId) =>
        this.respColorRepo.create({ responsableId, colorId }),
      );
      await this.respColorRepo.save(records);
    }

    // Sincronizar las semanas actual y futuras del responsable con sus
    // nuevas asignaciones (agrega/elimina registros diarios según corresponda)
    await this.reconciliationService.reconcileResponsable(responsableId);

    return this.getProductosResponsable(fincaId, responsableId);
  }
}
