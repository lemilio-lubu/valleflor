import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseSemanal } from './base-semanal.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { Semana } from '../semanas/semana.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ResponsableProducto } from '../responsables/responsable-producto.entity';

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

function getCurrentISOWeek(): { numeroSemana: number; anio: number } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { numeroSemana: weekNum, anio: d.getUTCFullYear() };
}

function getNextWeeks(startWeek: number, startYear: number, count: number): Array<{ anio: number; numeroSemana: number }> {
  const weeks = [];
  let w = startWeek;
  let y = startYear;
  for (let i = 0; i < count; i++) {
    weeks.push({ anio: y, numeroSemana: w });
    w++;
    if (w > 52) { // Asumimos 52 por simplicidad, aunque algunas tienen 53
      w = 1;
      y++;
    }
  }
  return weeks;
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
    @InjectRepository(ResponsableProducto)
    private readonly respProductoRepo: Repository<ResponsableProducto>,
  ) {}

  async recalcular(
    colorId: string,
    semanaId: string,
    numeroSemana: number,
    anio: number,
  ): Promise<BaseSemanal> {
    const registros = await this.registroRepo.find({ where: { colorId, semanaId } });

    const cajasTotal = Math.round(registros.reduce((s, r) => s + Number(r.cajas), 0) * 100) / 100;
    const tallosTotal = Math.round(registros.reduce((s, r) => s + Number(r.tallos), 0) * 100) / 100;

    const semana = await this.semanaRepo.findOne({ where: { id: semanaId } });
    const hoy = new Date().toISOString().split('T')[0];
    const esReal = semana ? semana.fechaFin < hoy : false;

    let base = await this.baseSemanalRepo.findOne({ where: { colorId, numeroSemana, anio } });
    if (base) {
      base.cajasTotal = cajasTotal;
      base.tallosTotal = tallosTotal;
      base.esReal = esReal;
    } else {
      base = this.baseSemanalRepo.create({ colorId, numeroSemana, anio, cajasTotal, tallosTotal, esReal, cajasEstimadas: 0, tallosEstimados: 0 });
    }
    return this.baseSemanalRepo.save(base);
  }

  async upsertEstimacion(
    colorId: string,
    numeroSemana: number,
    anio: number,
    cajasEstimadas: number,
    divisor: number,
  ): Promise<BaseSemanal> {
    let base = await this.baseSemanalRepo.findOne({ where: { colorId, numeroSemana, anio } });
    const tallosEstimados = Math.round(cajasEstimadas * divisor * 100) / 100;
    
    if (base) {
      base.cajasEstimadas = cajasEstimadas;
      base.tallosEstimados = tallosEstimados;
    } else {
      base = this.baseSemanalRepo.create({ 
        colorId, 
        numeroSemana, 
        anio, 
        cajasTotal: 0, 
        tallosTotal: 0, 
        cajasEstimadas, 
        tallosEstimados, 
        esReal: false 
      });
    }
    return this.baseSemanalRepo.save(base);
  }

  private async fetchRows(fincaId: string): Promise<BaseSemanal[]> {
    return this.baseSemanalRepo
      .createQueryBuilder('bs')
      .innerJoinAndSelect('bs.color', 'color')
      .innerJoinAndSelect('color.variedad', 'variedad')
      .innerJoinAndSelect('variedad.producto', 'producto')
      .innerJoinAndSelect('producto.finca', 'finca')
      .where('producto.fincaId = :fincaId', { fincaId })
      .getMany();
  }

  private buildMatriz(rows: BaseSemanal[], semanaKeys?: Set<string>): MatrizRow[] {
    const map = new Map<string, MatrizRow>();
    for (const bs of rows) {
      const key = `${bs.anio}-${bs.numeroSemana}`;
      if (semanaKeys && !semanaKeys.has(key)) continue;
      if (!map.has(bs.colorId)) {
        map.set(bs.colorId, {
          finca: bs.color?.variedad?.producto?.finca?.nombre || '',
          producto: bs.color?.variedad?.producto?.nombre || '',
          variedad: bs.color?.variedad?.nombre || '',
          color: bs.color?.nombre || '',
          colorId: bs.colorId,
          semanas: {},
        });
      }
      map.get(bs.colorId).semanas[String(bs.numeroSemana)] = {
        cajas: Number(bs.cajasTotal),
        tallos: Number(bs.tallosTotal),
        cajasEstimadas: Number(bs.cajasEstimadas || 0),
        tallosEstimados: Number(bs.tallosEstimados || 0),
        esReal: bs.esReal,
      };
    }
    return Array.from(map.values()).sort((a, b) => {
      const p = a.producto.localeCompare(b.producto);
      if (p !== 0) return p;
      const v = a.variedad.localeCompare(b.variedad);
      if (v !== 0) return v;
      return a.color.localeCompare(b.color);
    });
  }

  private async getProductoIdsAsignados(userId: string): Promise<string[] | null> {
    const responsable = await this.responsableRepo.findOne({ where: { userId } });
    if (!responsable) return null;
    const asignaciones = await this.respProductoRepo.find({ where: { responsableId: responsable.id } });
    return asignaciones.map((a) => a.productoId);
  }

  async findMatriz(fincaId: string, cantSemanas: number, userId: string): Promise<{ semanas: { anio: number; numeroSemana: number }[]; rows: MatrizRow[] }> {
    const { numeroSemana, anio } = getCurrentISOWeek();
    const targetWeeks = getNextWeeks(numeroSemana, anio, cantSemanas + 1);
    const semanaKeys = new Set(targetWeeks.map((s) => `${s.anio}-${s.numeroSemana}`));

    const productoIds = await this.getProductoIdsAsignados(userId);

    let qb = this.baseSemanalRepo
      .createQueryBuilder('bs')
      .innerJoinAndSelect('bs.color', 'color')
      .innerJoinAndSelect('color.variedad', 'variedad')
      .innerJoinAndSelect('variedad.producto', 'producto')
      .innerJoinAndSelect('producto.finca', 'finca')
      .where('producto.fincaId = :fincaId', { fincaId });

    if (productoIds !== null && productoIds.length > 0) {
      qb = qb.andWhere('variedad.productoId IN (:...productoIds)', { productoIds });
    } else if (productoIds !== null && productoIds.length === 0) {
      return { semanas: targetWeeks, rows: [] };
    }

    const rows = await qb.getMany();
    const matrizRows = this.buildMatriz(rows, semanaKeys);

    // Asegurar que todos los colores asignados aparezcan aunque no tengan registros aún
    const queryRunner = this.baseSemanalRepo.manager.connection.createQueryRunner();
    let colorQuery = `SELECT c.id as "colorId", c.nombre as color, v.nombre as variedad, p.nombre as producto, f.nombre as finca
       FROM colores c
       JOIN variedades v ON c.variedad_id = v.id
       JOIN productos p ON v.producto_id = p.id
       JOIN fincas f ON p.finca_id = f.id
       WHERE f.id = $1`;
    const params: any[] = [fincaId];
    if (productoIds !== null && productoIds.length > 0) {
      colorQuery += ` AND p.id = ANY($2)`;
      params.push(productoIds);
    }
    const todosLosColores = await queryRunner.query(colorQuery, params);
    await queryRunner.release();

    const matrizMap = new Map(matrizRows.map((r) => [r.colorId, r]));
    for (const c of todosLosColores) {
      if (!matrizMap.has(c.colorId)) {
        matrizMap.set(c.colorId, { finca: c.finca, producto: c.producto, variedad: c.variedad, color: c.color, colorId: c.colorId, semanas: {} });
      }
    }

    const finalRows = Array.from(matrizMap.values()).sort((a, b) => {
      const p = a.producto.localeCompare(b.producto);
      if (p !== 0) return p;
      const v = a.variedad.localeCompare(b.variedad);
      if (v !== 0) return v;
      return a.color.localeCompare(b.color);
    });

    return { semanas: targetWeeks, rows: finalRows };
  }

  async findSemanaActual(fincaId: string, userId: string): Promise<MatrizRow[]> {
    const { numeroSemana, anio } = getCurrentISOWeek();
    const productoIds = await this.getProductoIdsAsignados(userId);

    let qb = this.baseSemanalRepo
      .createQueryBuilder('bs')
      .innerJoinAndSelect('bs.color', 'color')
      .innerJoinAndSelect('color.variedad', 'variedad')
      .innerJoinAndSelect('variedad.producto', 'producto')
      .innerJoinAndSelect('producto.finca', 'finca')
      .where('producto.fincaId = :fincaId', { fincaId })
      .andWhere('bs.numeroSemana = :numeroSemana', { numeroSemana })
      .andWhere('bs.anio = :anio', { anio });

    if (productoIds !== null && productoIds.length > 0) {
      qb = qb.andWhere('variedad.productoId IN (:...productoIds)', { productoIds });
    } else if (productoIds !== null && productoIds.length === 0) {
      return [];
    }

    const rows = await qb.getMany();
    return this.buildMatriz(rows);
  }
}
