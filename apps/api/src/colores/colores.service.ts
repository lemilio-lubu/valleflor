import {
  BadRequestException,
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
import { SemanaReconciliationService } from '../base-semanal/semana-reconciliation.service';
import { JwtUser } from '../auth/types/jwt-user.type';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { AccionAuditoria, ModuloAuditoria } from '../auditoria/movimiento-auditoria.entity';

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
    private readonly reconciliationService: SemanaReconciliationService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async findAll(
    variedadId?: string,
    incluirInactivos = false,
  ): Promise<(Color & { eliminable: boolean })[]> {
    let colores: Color[];
    if (variedadId) {
      const where = incluirInactivos
        ? { variedadId }
        : { variedadId, activo: true };
      // Activos primero, inactivos al final; alfabético dentro de cada grupo.
      colores = await this.colorRepo.find({
        where,
        order: { activo: 'DESC', nombre: 'ASC' },
      });
    } else {
      colores = await this.colorRepo.find({
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
    return this.attachEliminable(colores);
  }

  // `eliminable` = el DELETE haría borrado físico: el color NO tiene historial
  // (ni en base_semanal ni en registros_diarios). Mismo criterio que remove().
  private async attachEliminable(
    colores: Color[],
  ): Promise<(Color & { eliminable: boolean })[]> {
    if (colores.length === 0) return [];
    const ids = colores.map((c) => c.id);
    const [baseRows, regRows] = await Promise.all([
      this.baseSemanalRepo
        .createQueryBuilder('b')
        .select('b.color_id', 'colorId')
        .where('b.color_id IN (:...ids)', { ids })
        .groupBy('b.color_id')
        .getRawMany<{ colorId: string }>(),
      this.registroRepo
        .createQueryBuilder('r')
        .select('r.color_id', 'colorId')
        .where('r.color_id IN (:...ids)', { ids })
        .groupBy('r.color_id')
        .getRawMany<{ colorId: string }>(),
    ]);
    const conDatos = new Set(
      [...baseRows, ...regRows].map((x) => x.colorId),
    );
    return colores.map((c) =>
      Object.assign(c, { eliminable: !conDatos.has(c.id) }),
    );
  }

  async create(dto: CreateColorDto, actor?: JwtUser): Promise<Color> {
    const variedad = await this.variedadRepo.findOne({
      where: { id: dto.variedadId },
    });
    if (!variedad) {
      throw new NotFoundException(`Variedad ${dto.variedadId} no encontrada`);
    }

    const nombre = dto.nombre.toUpperCase().trim();
    const codigo = dto.codigo.toUpperCase().trim();

    const exists = await this.colorRepo.findOne({
      where: { nombre, variedadId: dto.variedadId },
    });
    if (exists) {
      throw new ConflictException(
        `Ya existe el color "${nombre}" en esta variedad`,
      );
    }

    const codigoExists = await this.colorRepo.findOne({ where: { codigo } });
    if (codigoExists) {
      throw new ConflictException(`Ya existe una definición con el código "${codigo}"`);
    }

    const color = this.colorRepo.create({
      nombre,
      variedadId: dto.variedadId,
      codigo,
      nombreComercial: dto.nombreComercial ?? null,
      tallosPorCaja: dto.tallosPorCaja ?? 400,
    });
    const saved = await this.colorRepo.save(color);
    if (actor) {
      await this.auditoriaService.registrar({
        actor,
        accion: AccionAuditoria.CREACION,
        modulo: ModuloAuditoria.CATALOGO,
        valorNuevo: `${saved.codigo} · ${saved.nombre}`,
      });
    }
    return saved;
  }

  async update(id: string, dto: UpdateColorDto, actor?: JwtUser): Promise<Color> {
    const color = await this.colorRepo.findOne({ where: { id } });
    if (!color) throw new NotFoundException(`Color ${id} no encontrado`);
    // Snapshot previo para auditar cada campo del ítem que cambió.
    const nombreAnterior = color.nombre;
    const codigoAnterior = color.codigo;
    const nombreComercialAnterior = color.nombreComercial ?? null;
    const tallosAnterior = color.tallosPorCaja;

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

    if (dto.codigo) {
      const codigo = dto.codigo.toUpperCase().trim();
      const exists = await this.colorRepo.findOne({ where: { codigo } });
      if (exists && exists.id !== id) {
        throw new ConflictException(`Ya existe una definición con el código "${codigo}"`);
      }
      dto.codigo = codigo;
    }

    Object.assign(color, dto);
    const saved = await this.colorRepo.save(color);
    if (actor) {
      await this.auditoriaService.registrarCambios(actor, ModuloAuditoria.CATALOGO, [
        { campo: 'Nombre', valorAnterior: nombreAnterior, valorNuevo: saved.nombre },
        { campo: 'Código', valorAnterior: codigoAnterior, valorNuevo: saved.codigo },
        {
          campo: 'Nombre comercial',
          valorAnterior: nombreComercialAnterior,
          valorNuevo: saved.nombreComercial ?? null,
        },
        {
          campo: 'Tallos por caja',
          valorAnterior: String(tallosAnterior),
          valorNuevo: String(saved.tallosPorCaja),
        },
      ]);
    }
    return saved;
  }

  async darDeBaja(id: string, motivoBaja: string, actor?: JwtUser): Promise<Color> {
    const color = await this.colorRepo.findOne({ where: { id } });
    if (!color) throw new NotFoundException(`Color ${id} no encontrado`);

    color.activo = false;
    color.motivoBaja = motivoBaja ?? null;
    await this.colorRepo.save(color);

    await this.reconciliationService.reconcileColores([color.id]);
    if (actor) {
      await this.auditoriaService.registrar({
        actor,
        accion: AccionAuditoria.BAJA,
        modulo: ModuloAuditoria.CATALOGO,
        valorAnterior: `${color.codigo} · ${color.nombre}`,
      });
    }
    return color;
  }

  async darDeAlta(id: string, actor?: JwtUser): Promise<Color> {
    const color = await this.colorRepo.findOne({
      where: { id },
      relations: ['variedad', 'variedad.producto'],
    });
    if (!color) throw new NotFoundException(`Color ${id} no encontrado`);

    const variedad = color.variedad;
    const producto = variedad?.producto;
    if (!variedad?.activo || !producto?.activo) {
      throw new BadRequestException(
        'La variedad o el producto está dado de baja; reactívalo primero',
      );
    }

    color.activo = true;
    color.motivoBaja = null;
    await this.colorRepo.save(color);

    await this.reconciliationService.reconcileColores([color.id]);
    if (actor) {
      await this.auditoriaService.registrar({
        actor,
        accion: AccionAuditoria.ALTA,
        modulo: ModuloAuditoria.CATALOGO,
        valorNuevo: `${color.codigo} · ${color.nombre}`,
      });
    }
    return color;
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
      // Reflejar la baja en las semanas actual y futuras de los responsables.
      await this.reconciliationService.reconcileColoresDadosDeBaja([color.id]);
    } else {
      // No data — safe to hard delete
      await this.colorRepo.remove(color);
    }
  }
}
