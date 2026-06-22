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
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AccionAuditoria, ModuloAuditoria } from '../auditoria/movimiento-auditoria.entity';

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
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(user: JwtUser): Promise<Finca[]> {
    if (user.role === UserRole.ADMIN) {
      // Activas primero, inactivas al final; alfabético dentro de cada grupo.
      return this.fincaRepo.find({
        relations: ['admin'],
        order: { activo: 'DESC', nombre: 'ASC' },
      });
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
    const exists = await this.fincaRepo.findOne({ where: { nombre: dto.nombre } });
    if (exists) {
      throw new ConflictException(`Ya existe la finca "${dto.nombre}"`);
    }

    const finca = this.fincaRepo.create({ nombre: dto.nombre, ubicacion: dto.ubicacion ?? null, adminId: user.id });
    const saved = await this.fincaRepo.save(finca);
    await this.auditoriaService.registrar({
      actor: user,
      accion: AccionAuditoria.CREACION,
      modulo: ModuloAuditoria.FINCAS,
      valorNuevo: saved.nombre,
    });
    return saved;
  }

  async update(id: string, dto: UpdateFincaDto, user: JwtUser): Promise<Finca> {
    const finca = await this.findOne(id);
    // Snapshot previo para auditar cada campo modificado por separado.
    const nombreAnterior = finca.nombre;
    const ubicacionAnterior = finca.ubicacion ?? null;
    Object.assign(finca, dto);
    const saved = await this.fincaRepo.save(finca);
    await this.auditoriaService.registrarCambios(user, ModuloAuditoria.FINCAS, [
      { campo: 'Nombre', valorAnterior: nombreAnterior, valorNuevo: saved.nombre },
      { campo: 'Ubicación', valorAnterior: ubicacionAnterior, valorNuevo: saved.ubicacion ?? null },
    ]);
    return saved;
  }

  async darDeBaja(id: string, motivoBaja: string, user: JwtUser): Promise<Finca> {
    const finca = await this.fincaRepo.findOne({ where: { id } });
    if (!finca) throw new NotFoundException(`Finca ${id} no encontrada`);
    finca.activo = false;
    finca.motivoBaja = motivoBaja;
    const saved = await this.fincaRepo.save(finca);
    await this.auditoriaService.registrar({
      actor: user,
      accion: AccionAuditoria.BAJA,
      modulo: ModuloAuditoria.FINCAS,
      valorAnterior: saved.nombre,
    });
    return saved;
  }

  async darDeAlta(id: string, user: JwtUser): Promise<Finca> {
    const finca = await this.fincaRepo.findOne({ where: { id } });
    if (!finca) throw new NotFoundException(`Finca ${id} no encontrada`);
    finca.activo = true;
    finca.motivoBaja = null;
    const saved = await this.fincaRepo.save(finca);
    await this.auditoriaService.registrar({
      actor: user,
      accion: AccionAuditoria.ALTA,
      modulo: ModuloAuditoria.FINCAS,
      valorNuevo: saved.nombre,
    });
    return saved;
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
    actor: JwtUser,
  ): Promise<Responsable> {
    const finca = await this.findOne(fincaId);

    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException(`Usuario ${dto.userId} no encontrado`);
    if (user.role !== UserRole.RESPONSABLE) {
      throw new ForbiddenException('El usuario debe tener rol responsable');
    }

    // Registra la asignación: el campo es a QUIÉN se asigna; el valor anterior
    // es la finca previa (si la había) y el nuevo es la finca destino.
    const personaAsignada = user.nombre ?? user.email;
    const auditarAsignacion = (fincaAnterior: string | null) =>
      this.auditoriaService.registrar({
        actor,
        accion: AccionAuditoria.ASIGNACION_RESPONSABLE,
        modulo: ModuloAuditoria.FINCAS,
        campo: personaAsignada,
        valorAnterior: fincaAnterior,
        valorNuevo: finca.nombre,
      });

    const existing = await this.responsableRepo.findOne({
      where: { userId: dto.userId },
      withDeleted: true,
    });
    if (existing) {
      if (existing.fincaId === fincaId) {
        if (existing.deletedAt) {
          await this.responsableRepo.recover(existing);
          await auditarAsignacion(null);
          return this.responsableRepo.findOne({
            where: { id: existing.id },
            relations: ['user'],
          });
        }
        throw new ConflictException('El usuario ya está asignado a esta finca');
      }
      // Cambio de finca: capturar el nombre de la finca anterior antes de mover.
      const fincaPrevia = await this.fincaRepo.findOne({ where: { id: existing.fincaId } });
      const fincaAnteriorNombre = fincaPrevia?.nombre ?? null;
      // Al cambiar de finca solo se limpian las asignaciones de colores.
      // Las semanas y base_semanal se conservan asociadas a su finca_id original,
      // por lo que el responsable las recupera al volver a esa finca.
      await this.respColorRepo.delete({ responsableId: existing.id });
      if (existing.deletedAt) {
        await this.responsableRepo.recover(existing);
      }
      await this.responsableRepo.update(existing.id, { fincaId });
      await auditarAsignacion(fincaAnteriorNombre);
      return this.responsableRepo.findOne({
        where: { id: existing.id },
        relations: ['user'],
      });
    }

    const responsable = this.responsableRepo.create({
      userId: dto.userId,
      fincaId,
    });
    const savedResp = await this.responsableRepo.save(responsable);
    await auditarAsignacion(null);
    return savedResp;
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
    actor?: JwtUser,
  ): Promise<Producto[]> {
    const responsable = await this.responsableRepo.findOne({
      where: { id: responsableId, fincaId },
      relations: ['user'],
    });
    if (!responsable) throw new NotFoundException('Responsable no encontrado en esta finca');

    // Estado previo de colores asignados, para auditar qué se añadió/quitó.
    const asignacionesPrevias = await this.respColorRepo.find({ where: { responsableId } });
    const colorIdsPrevios = new Set(asignacionesPrevias.map((a) => a.colorId));

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

    // Auditar el cambio de asignaciones (qué colores se añadieron/quitaron).
    if (actor) {
      await this.auditarAsignacionColores(responsable, colorIdsPrevios, colorIdSet, actor);
    }

    return this.getProductosResponsable(fincaId, responsableId);
  }

  /**
   * Registra en auditoría el diff de colores asignados a un responsable: un
   * movimiento con la lista de añadidos y otra con la de quitados (por nombre).
   */
  private async auditarAsignacionColores(
    responsable: Responsable,
    colorIdsPrevios: Set<string>,
    colorIdsNuevos: Set<string>,
    actor: JwtUser,
  ): Promise<void> {
    const anadidos = [...colorIdsNuevos].filter((id) => !colorIdsPrevios.has(id));
    const quitados = [...colorIdsPrevios].filter((id) => !colorIdsNuevos.has(id));
    if (anadidos.length === 0 && quitados.length === 0) return;

    const nombresDe = async (ids: string[]): Promise<string> => {
      if (ids.length === 0) return '—';
      const colores = await this.colorRepo.find({ where: { id: In(ids) } });
      return colores.map((c) => c.nombre).sort().join(', ');
    };

    const persona = responsable.user?.nombre ?? responsable.user?.email ?? responsable.id;
    await this.auditoriaService.registrar({
      actor,
      accion: AccionAuditoria.ASIGNACION_RESPONSABLE,
      modulo: ModuloAuditoria.FINCAS,
      campo: `Colores asignados · ${persona}`,
      valorAnterior: await nombresDe(quitados),
      valorNuevo: await nombresDe(anadidos),
    });
  }
}
