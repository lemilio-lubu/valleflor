import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AccionAuditoria,
  ModuloAuditoria,
  MovimientoAuditoria,
} from './movimiento-auditoria.entity';
import { User } from '../users/user.entity';
import { now } from '../common/clock';

/** Años que se conservan los movimientos antes de quedar fuera de la consulta. */
const RETENCION_ANIOS = 3;

/** Autor de un movimiento. `nombre` opcional: si falta se resuelve por id. */
export interface ActorAuditoria {
  id?: string;
  email?: string;
  nombre?: string | null;
}

export interface RegistrarInput {
  actor: ActorAuditoria;
  accion: AccionAuditoria;
  modulo: ModuloAuditoria;
  campo?: string | null;
  valorAnterior?: string | null;
  valorNuevo?: string | null;
}

/** Un cambio de campo individual para `registrarCambios`. */
export interface CambioCampo {
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
}

export interface MovimientoDto {
  id: string;
  responsable: string;
  accion: string;
  modulo: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: Date;
}

export interface FiltrosCambios {
  modulo?: string;
  responsable?: string;
  accion?: string;
  desde?: Date;
  hasta?: Date;
}

@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(MovimientoAuditoria)
    private readonly repo: Repository<MovimientoAuditoria>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /** Punto único de escritura de la auditoría. */
  async registrar(input: RegistrarInput): Promise<MovimientoAuditoria> {
    let nombre = input.actor.nombre;
    // Si solo llega el JwtUser (id + email), se resuelve el nombre del usuario.
    if (nombre == null && input.actor.id) {
      const u = await this.userRepo.findOne({ where: { id: input.actor.id } });
      nombre = u?.nombre ?? null;
    }
    const actorNombre = nombre ?? input.actor.email ?? 'desconocido';

    const mov = this.repo.create({
      actorId: input.actor.id ?? null,
      actorNombre,
      accion: input.accion,
      modulo: input.modulo,
      campo: input.campo ?? null,
      valorAnterior: input.valorAnterior ?? null,
      valorNuevo: input.valorNuevo ?? null,
      fecha: now(),
    });
    return this.repo.save(mov);
  }

  /**
   * Registra una EDICIÓN multi-campo: un movimiento por cada campo que realmente
   * cambió (compara valorAnterior !== valorNuevo). Si nada cambió, no escribe nada.
   * Centraliza la comparación para que cada `update()` no la repita.
   */
  async registrarCambios(
    actor: ActorAuditoria,
    modulo: ModuloAuditoria,
    cambios: CambioCampo[],
  ): Promise<void> {
    for (const c of cambios) {
      if (c.valorAnterior === c.valorNuevo) continue;
      await this.registrar({
        actor,
        accion: AccionAuditoria.EDICION,
        modulo,
        campo: c.campo,
        valorAnterior: c.valorAnterior,
        valorNuevo: c.valorNuevo,
      });
    }
  }

  /** Movimientos del historial de cambios (excluye accesos), con filtros y retención. */
  async consultarCambios(filtros: FiltrosCambios = {}): Promise<MovimientoDto[]> {
    const qb = this.repo
      .createQueryBuilder('m')
      .where('m.modulo != :accesos', { accesos: ModuloAuditoria.ACCESOS })
      .andWhere('m.fecha >= :cutoff', { cutoff: this.cutoff() });

    if (filtros.modulo) qb.andWhere('m.modulo = :modulo', { modulo: filtros.modulo });
    if (filtros.responsable)
      qb.andWhere('m.actor_nombre = :responsable', { responsable: filtros.responsable });
    if (filtros.accion) qb.andWhere('m.accion = :accion', { accion: filtros.accion });
    if (filtros.desde) qb.andWhere('m.fecha >= :desde', { desde: filtros.desde });
    if (filtros.hasta) qb.andWhere('m.fecha <= :hasta', { hasta: filtros.hasta });

    const rows = await qb.orderBy('m.fecha', 'DESC').getMany();
    return rows.map((m) => this.toDto(m));
  }

  /** Inicios de sesión, en su apartado propio "Accesos al sistema". */
  async consultarAccesos(): Promise<{ responsable: string; fecha: Date }[]> {
    const rows = await this.repo
      .createQueryBuilder('m')
      .where('m.modulo = :accesos', { accesos: ModuloAuditoria.ACCESOS })
      .andWhere('m.fecha >= :cutoff', { cutoff: this.cutoff() })
      .orderBy('m.fecha', 'DESC')
      .getMany();
    return rows.map((m) => ({ responsable: m.actorNombre, fecha: m.fecha }));
  }

  /** Borrado físico de movimientos fuera del plazo de retención (para un cron). */
  async purgarAntiguos(): Promise<number> {
    const res = await this.repo
      .createQueryBuilder()
      .delete()
      .where('fecha < :cutoff', { cutoff: this.cutoff() })
      .execute();
    return res.affected ?? 0;
  }

  /** Fecha límite: movimientos anteriores a "ahora menos 3 años" no se conservan. */
  private cutoff(): Date {
    const d = new Date(now());
    d.setFullYear(d.getFullYear() - RETENCION_ANIOS);
    return d;
  }

  private toDto(m: MovimientoAuditoria): MovimientoDto {
    return {
      id: m.id,
      responsable: m.actorNombre,
      accion: m.accion,
      modulo: m.modulo,
      campo: m.campo,
      valorAnterior: m.valorAnterior,
      valorNuevo: m.valorNuevo,
      fecha: m.fecha,
    };
  }
}
