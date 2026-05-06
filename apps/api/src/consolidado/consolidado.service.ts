import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroDiario, DiaSemana } from '../registros/registro-diario.entity';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';

export interface DiaData {
  cajas: number;
  tallos: number;
}

export interface ConsolidadoDiarioRow {
  producto: string;
  variedad: string;
  color: string;
  finca: string;
  dias: Partial<Record<DiaSemana, DiaData>>;
  totalCajas: number;
  totalTallos: number;
}

export interface ConsolidadoSemanalRow {
  producto: string;
  variedad: string;
  color: string;
  finca: string;
  cajasEstimadas: number;
  tallosEstimados: number;
  cajasReales: number;
  tallosReales: number;
}

@Injectable()
export class ConsolidadoService {
  constructor(
    @InjectRepository(RegistroDiario)
    private readonly registroRepo: Repository<RegistroDiario>,
    @InjectRepository(BaseSemanal)
    private readonly baseSemanalRepo: Repository<BaseSemanal>,
  ) {}

  async getDiario(
    fincaId?: string,
    responsableId?: string,
    semana?: number,
    anio?: number,
  ): Promise<ConsolidadoDiarioRow[]> {
    type RawRow = {
      producto: string;
      variedad: string;
      color: string;
      finca: string;
      dia: string;
      cajas: string;
      tallos: string;
    };

    const rawRows = await this.registroRepo.manager.query<RawRow[]>(
      `
      SELECT
        p.nombre AS producto,
        v.nombre AS variedad,
        c.nombre  AS color,
        f.nombre  AS finca,
        rd.dia    AS dia,
        SUM(rd.cajas)  AS cajas,
        SUM(rd.tallos) AS tallos
      FROM registros_diarios rd
      JOIN colores      c ON c.id = rd.color_id
      JOIN variedades   v ON v.id = c.variedad_id
      JOIN productos    p ON p.id = v.producto_id
      JOIN fincas       f ON f.id = p.finca_id
      JOIN semanas      s ON s.id = rd.semana_id
      JOIN responsables r ON r.id = s.responsable_id
      WHERE ($1::uuid IS NULL OR f.id = $1::uuid)
        AND ($2::uuid IS NULL OR r.id = $2::uuid)
        AND ($3::int  IS NULL OR s.numero_semana = $3::int)
        AND ($4::int  IS NULL OR s.anio = $4::int)
      GROUP BY p.nombre, v.nombre, c.nombre, f.nombre, rd.dia
      ORDER BY p.nombre, v.nombre, c.nombre
      `,
      [fincaId || null, responsableId || null, semana ?? null, anio ?? null],
    );

    const map = new Map<string, ConsolidadoDiarioRow>();
    for (const row of rawRows) {
      const key = `${row.finca}||${row.producto}||${row.variedad}||${row.color}`;
      if (!map.has(key)) {
        map.set(key, {
          producto: row.producto,
          variedad: row.variedad,
          color: row.color,
          finca: row.finca,
          dias: {},
          totalCajas: 0,
          totalTallos: 0,
        });
      }
      const entry = map.get(key)!;
      const cajas = Math.round(Number(row.cajas) * 100) / 100;
      const tallos = Math.round(Number(row.tallos) * 100) / 100;
      entry.dias[row.dia as DiaSemana] = { cajas, tallos };
      entry.totalCajas = Math.round((entry.totalCajas + cajas) * 100) / 100;
      entry.totalTallos = Math.round((entry.totalTallos + tallos) * 100) / 100;
    }

    return Array.from(map.values());
  }

  async getSemanal(
    fincaId?: string,
    responsableId?: string,
    semana?: number,
    anio?: number,
  ): Promise<ConsolidadoSemanalRow[]> {
    type RawRow = {
      producto: string;
      variedad: string;
      color: string;
      finca: string;
      cajas_estimadas: string;
      tallos_estimados: string;
      cajas_reales: string;
      tallos_reales: string;
    };

    const rawRows = await this.baseSemanalRepo.manager.query<RawRow[]>(
      `
      SELECT
        p.nombre AS producto,
        v.nombre AS variedad,
        c.nombre AS color,
        f.nombre AS finca,
        SUM(bs.cajas_estimadas) AS cajas_estimadas,
        SUM(bs.tallos_estimados) AS tallos_estimados,
        SUM(bs.cajas_total)     AS cajas_reales,
        SUM(bs.tallos_total)    AS tallos_reales
      FROM base_semanal bs
      JOIN colores    c ON c.id = bs.color_id
      JOIN variedades v ON v.id = c.variedad_id
      JOIN productos  p ON p.id = v.producto_id
      JOIN fincas     f ON f.id = p.finca_id
      WHERE ($1::uuid IS NULL OR f.id = $1::uuid)
        AND ($2::uuid IS NULL OR EXISTS (
          SELECT 1 FROM responsable_colores rc
          WHERE rc.color_id = c.id AND rc.responsable_id = $2::uuid
        ))
        AND ($3::int IS NULL OR bs.numero_semana = $3::int)
        AND ($4::int IS NULL OR bs.anio = $4::int)
      GROUP BY p.nombre, v.nombre, c.nombre, f.nombre
      ORDER BY p.nombre, v.nombre, c.nombre
      `,
      [fincaId || null, responsableId || null, semana ?? null, anio ?? null],
    );

    return rawRows.map((row) => ({
      producto: row.producto,
      variedad: row.variedad,
      color: row.color,
      finca: row.finca,
      cajasEstimadas: Math.round(Number(row.cajas_estimadas) * 100) / 100,
      tallosEstimados: Math.round(Number(row.tallos_estimados) * 100) / 100,
      cajasReales: Math.round(Number(row.cajas_reales) * 100) / 100,
      tallosReales: Math.round(Number(row.tallos_reales) * 100) / 100,
    }));
  }
}
