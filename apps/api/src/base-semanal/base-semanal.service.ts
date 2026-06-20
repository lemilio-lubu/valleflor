import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseSemanal } from './base-semanal.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { Semana } from '../semanas/semana.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';
import { Color } from '../colores/color.entity';
import { getCurrentISOWeek, getNextWeeks } from '../common/iso-week.util';

export interface SemanaData {
  cajas: number;
  tallos: number;
  cajasEstimadas: number;
  tallosEstimados: number;
  esReal: boolean;
}

export interface MatrizRow {
  finca: string;
  producto: string;
  variedad: string;
  color: string;
  colorId: string;
  semanas: Record<string, SemanaData>;
}

@Injectable()
export class BaseSemanalService {
  constructor(
    @InjectRepository(BaseSemanal)
    private readonly baseSemanalRepo: Repository<BaseSemanal>,
    @InjectRepository(RegistroDiario)
    private readonly registroRepo: Repository<RegistroDiario>,
    @InjectRepository(Semana)
    private readonly semanaRepo: Repository<Semana>,
    @InjectRepository(Responsable)
    private readonly responsableRepo: Repository<Responsable>,
    @InjectRepository(ResponsableColor)
    private readonly respColorRepo: Repository<ResponsableColor>,
  ) {}

  /** Tallos por caja del color, leído desde su producto. */
  private tallosPorCajaDe(color?: Color | null): number {
    return color?.tallosPorCaja ?? 0;
  }

  async recalcular(
    colorId: string,
    semanaId: string,
    numeroSemana: number,
    anio: number,
  ): Promise<BaseSemanal> {
    const semana = await this.semanaRepo.findOne({ where: { id: semanaId } });
    if (!semana) throw new NotFoundException(`Semana ${semanaId} no encontrada`);
    const responsableId = semana.responsableId;

    const registros = await this.registroRepo.find({ where: { colorId, semanaId } });

    const cajasTotal = Math.round(registros.reduce((s, r) => s + Number(r.cajas), 0) * 100) / 100;
    const tallosTotal = Math.round(registros.reduce((s, r) => s + Number(r.tallos), 0) * 100) / 100;

    const { numeroSemana: currentWeekNum, anio: currentYear } = getCurrentISOWeek();
    const isPastOrCurrent =
      semana.anio < currentYear ||
      (semana.anio === currentYear && semana.numeroSemana <= currentWeekNum);
    // Real si tiene datos ingresados, o si la semana ya pasó/es la actual
    const esReal = cajasTotal > 0 || isPastOrCurrent;

    let base = await this.baseSemanalRepo.findOne({
      where: { responsableId, colorId, numeroSemana, anio },
    });
    if (base) {
      base.cajasTotal = cajasTotal;
      base.tallosTotal = tallosTotal;
      base.esReal = esReal;
    } else {
      base = this.baseSemanalRepo.create({
        responsableId,
        colorId,
        numeroSemana,
        anio,
        cajasTotal,
        tallosTotal,
        esReal,
        cajasEstimadas: 0,
        tallosEstimados: 0,
      });
    }
    return this.baseSemanalRepo.save(base);
  }

  async resetSemana(
    responsableId: string,
    colorIds: string[],
    numeroSemana: number,
    anio: number,
  ): Promise<void> {
    if (colorIds.length === 0) return;
    const registros = await this.baseSemanalRepo.find({
      where: colorIds.map((colorId) => ({ responsableId, colorId, numeroSemana, anio })),
    });
    for (const r of registros) {
      // Si no había estimación previa, el valor real pasa a ser la estimación
      if (Number(r.cajasEstimadas) === 0 && Number(r.cajasTotal) > 0) {
        r.cajasEstimadas = r.cajasTotal;
        r.tallosEstimados = r.tallosTotal;
      }
      r.cajasTotal = 0;
      r.tallosTotal = 0;
      r.esReal = false;
    }
    await this.baseSemanalRepo.save(registros);
  }

  async limpiarEstimacionesSemana(
    fincaId: string,
    numeroSemana: number,
    anio: number,
  ): Promise<void> {
    const responsables = await this.responsableRepo.find({ where: { fincaId } });
    const responsableIds = responsables.map((r) => r.id);
    if (responsableIds.length === 0) return;

    const rows = await this.baseSemanalRepo
      .createQueryBuilder('bs')
      .where('bs.responsable_id IN (:...responsableIds)', { responsableIds })
      .andWhere('bs.numeroSemana = :numeroSemana', { numeroSemana })
      .andWhere('bs.anio = :anio', { anio })
      .getMany();

    for (const r of rows) {
      r.cajasEstimadas = 0;
      r.tallosEstimados = 0;
    }
    if (rows.length > 0) await this.baseSemanalRepo.save(rows);
  }

  async upsertEstimacion(
    userId: string,
    colorId: string,
    numeroSemana: number,
    anio: number,
    cajasEstimadas: number,
    divisor: number,
  ): Promise<BaseSemanal> {
    const responsable = await this.responsableRepo.findOne({ where: { userId } });
    if (!responsable) throw new NotFoundException('No eres responsable de ninguna finca');

    let base = await this.baseSemanalRepo.findOne({
      where: { responsableId: responsable.id, colorId, numeroSemana, anio },
    });
    const tallosEstimados = Math.round(cajasEstimadas * divisor * 100) / 100;

    if (base) {
      base.cajasEstimadas = cajasEstimadas;
      base.tallosEstimados = tallosEstimados;
    } else {
      base = this.baseSemanalRepo.create({
        responsableId: responsable.id,
        colorId,
        numeroSemana,
        anio,
        cajasTotal: 0,
        tallosTotal: 0,
        cajasEstimadas,
        tallosEstimados,
        esReal: false,
      });
    }
    return this.baseSemanalRepo.save(base);
  }

  /** Colores activos asignados al responsable (cadena producto/variedad/color activa). */
  private async coloresAsignadosActivos(responsableId: string): Promise<Color[]> {
    const asignaciones = await this.respColorRepo.find({
      where: { responsableId },
      relations: ['color', 'color.variedad', 'color.variedad.producto'],
    });
    return asignaciones
      .map((a) => a.color)
      .filter(
        (c): c is Color =>
          !!c &&
          c.activo &&
          !!c.variedad?.activo &&
          !!c.variedad?.producto?.activo,
      );
  }

  private buildMatriz(
    rows: BaseSemanal[],
    fincaNombre: string,
    semanaKeys?: Set<string>,
    semanasCreadasKeys?: Set<string>,
  ): MatrizRow[] {
    const map = new Map<string, MatrizRow>();
    for (const bs of rows) {
      const key = `${bs.anio}-${bs.numeroSemana}`;
      if (semanaKeys && !semanaKeys.has(key)) continue;
      const tallosPorCaja = this.tallosPorCajaDe(bs.color);
      if (!map.has(bs.colorId)) {
        map.set(bs.colorId, {
          finca: fincaNombre,
          producto: bs.color?.variedad?.producto?.nombre || '',
          variedad: bs.color?.variedad?.nombre || '',
          color: bs.color?.nombre || '',
          colorId: bs.colorId,
          semanas: {},
        });
      }
      map.get(bs.colorId).semanas[String(bs.numeroSemana)] = {
        cajas: Number(bs.cajasTotal),
        tallos: Number(bs.cajasTotal) * tallosPorCaja,
        cajasEstimadas: Number(bs.cajasEstimadas || 0),
        tallosEstimados: Number(bs.cajasEstimadas || 0) * tallosPorCaja,
        esReal: (semanasCreadasKeys?.has(key) ?? false) || bs.esReal,
      };
    }
    return Array.from(map.values()).sort(this.sortRows);
  }

  private sortRows(a: MatrizRow, b: MatrizRow): number {
    const p = a.producto.localeCompare(b.producto);
    if (p !== 0) return p;
    const v = a.variedad.localeCompare(b.variedad);
    if (v !== 0) return v;
    return a.color.localeCompare(b.color);
  }

  async findMatriz(
    fincaId: string,
    cantSemanas: number,
    userId: string,
    startWeek?: number,
    startYear?: number,
  ): Promise<{ semanas: { anio: number; numeroSemana: number }[]; rows: MatrizRow[] }> {
    const current = getCurrentISOWeek();
    const numeroSemana = startWeek ?? current.numeroSemana;
    const anio = startYear ?? current.anio;
    const targetWeeks = getNextWeeks(numeroSemana, anio, cantSemanas + 1);
    const semanaKeys = new Set(targetWeeks.map((s) => `${s.anio}-${s.numeroSemana}`));

    const responsable = await this.responsableRepo.findOne({
      where: { userId },
      relations: ['finca'],
    });
    if (!responsable) return { semanas: targetWeeks, rows: [] };
    const fincaNombre = responsable.finca?.nombre ?? '';

    const semanasCreadas = await this.semanaRepo.find({
      where: { responsableId: responsable.id },
    });
    const semanasCreadasKeys = new Set(
      semanasCreadas
        .filter(
          (s) =>
            s.anio < current.anio ||
            (s.anio === current.anio && s.numeroSemana <= current.numeroSemana),
        )
        .map((s) => `${s.anio}-${s.numeroSemana}`),
    );

    const rows = await this.baseSemanalRepo
      .createQueryBuilder('bs')
      .innerJoinAndSelect('bs.color', 'color')
      .innerJoinAndSelect('color.variedad', 'variedad')
      .innerJoinAndSelect('variedad.producto', 'producto')
      .where('bs.responsable_id = :responsableId', { responsableId: responsable.id })
      .andWhere('color.activo = true')
      .andWhere('variedad.activo = true')
      .andWhere('producto.activo = true')
      .getMany();

    const matrizRows = this.buildMatriz(rows, fincaNombre, semanaKeys, semanasCreadasKeys);

    // Asegurar que todos los colores asignados aparezcan aunque no tengan registros aún
    const matrizMap = new Map(matrizRows.map((r) => [r.colorId, r]));
    const coloresAsignados = await this.coloresAsignadosActivos(responsable.id);
    for (const c of coloresAsignados) {
      if (!matrizMap.has(c.id)) {
        matrizMap.set(c.id, {
          finca: fincaNombre,
          producto: c.variedad?.producto?.nombre || '',
          variedad: c.variedad?.nombre || '',
          color: c.nombre,
          colorId: c.id,
          semanas: {},
        });
      }
    }

    const finalRows = Array.from(matrizMap.values()).sort(this.sortRows);
    return { semanas: targetWeeks, rows: finalRows };
  }

  async findSemanaActual(fincaId: string, userId: string): Promise<MatrizRow[]> {
    const { numeroSemana, anio } = getCurrentISOWeek();

    const responsable = await this.responsableRepo.findOne({
      where: { userId },
      relations: ['finca'],
    });
    if (!responsable) return [];
    const fincaNombre = responsable.finca?.nombre ?? '';

    const semanasCreadas = await this.semanaRepo.find({
      where: { responsableId: responsable.id },
    });
    const semanasCreadasKeys = new Set(
      semanasCreadas.map((s) => `${s.anio}-${s.numeroSemana}`),
    );

    const rows = await this.baseSemanalRepo
      .createQueryBuilder('bs')
      .innerJoinAndSelect('bs.color', 'color')
      .innerJoinAndSelect('color.variedad', 'variedad')
      .innerJoinAndSelect('variedad.producto', 'producto')
      .where('bs.responsable_id = :responsableId', { responsableId: responsable.id })
      .andWhere('color.activo = true')
      .andWhere('variedad.activo = true')
      .andWhere('producto.activo = true')
      .andWhere('bs.numeroSemana = :numeroSemana', { numeroSemana })
      .andWhere('bs.anio = :anio', { anio })
      .getMany();

    return this.buildMatriz(rows, fincaNombre, undefined, semanasCreadasKeys);
  }
}
