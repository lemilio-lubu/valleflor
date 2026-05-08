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
  dias: Partial<Record<DiaSemana, DiaData>>;
  totalCajas: number;
  totalTallos: number;
}

/** Una fila plana por (producto, variedad, color, semana) para que el frontend construya la matriz */
export interface ConsolidadoSemanalRow {
  producto: string;
  variedad: string;
  color: string;
  numeroSemana: number;
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

  /**
   * Consolidado Diario — muestra TODOS los colores del catálogo con la
   * suma de la plantilla diaria para la semana indicada (0 si no hay registros).
   * Agrupa por nombre de producto / variedad / color (suma entre todas las fincas).
   */
  async getDiario(
    semana?: number,
    anio?: number,
  ): Promise<ConsolidadoDiarioRow[]> {
    type RawRow = {
      producto: string;
      variedad: string;
      color: string;
      dia: string | null;
      cajas: string;
      tallos: string;
    };

    const rawRows = await this.registroRepo.manager.query<RawRow[]>(
      `
      SELECT
        p.nombre AS producto,
        v.nombre AS variedad,
        c.nombre  AS color,
        rd.dia    AS dia,
        COALESCE(SUM(rd.cajas), 0)  AS cajas,
        COALESCE(SUM(rd.tallos), 0) AS tallos
      FROM colores c
      JOIN variedades v ON v.id = c.variedad_id
      JOIN productos  p ON p.id = v.producto_id
      LEFT JOIN registros_diarios rd ON rd.color_id = c.id
      LEFT JOIN semanas s ON s.id = rd.semana_id
        AND ($1::int IS NULL OR s.numero_semana = $1::int)
        AND ($2::int IS NULL OR s.anio           = $2::int)
      GROUP BY p.nombre, v.nombre, c.nombre, rd.dia
      ORDER BY p.nombre, v.nombre, c.nombre
      `,
      [semana ?? null, anio ?? null],
    );

    const map = new Map<string, ConsolidadoDiarioRow>();
    for (const row of rawRows) {
      const key = `${row.producto}||${row.variedad}||${row.color}`;
      if (!map.has(key)) {
        map.set(key, {
          producto: row.producto,
          variedad: row.variedad,
          color: row.color,
          dias: {},
          totalCajas: 0,
          totalTallos: 0,
        });
      }
      const entry = map.get(key)!;

      // Si no hay registros el LEFT JOIN devuelve dia=null — ignorar esa fila
      if (row.dia) {
        const cajas = Math.round(Number(row.cajas) * 100) / 100;
        const tallos = Math.round(Number(row.tallos) * 100) / 100;
        entry.dias[row.dia as DiaSemana] = { cajas, tallos };
        entry.totalCajas = Math.round((entry.totalCajas + cajas) * 100) / 100;
        entry.totalTallos = Math.round((entry.totalTallos + tallos) * 100) / 100;
      }
    }

    return Array.from(map.values());
  }

  /**
   * Consolidado Semanal — muestra TODOS los colores del catálogo con los
   * totales de base_semanal para el rango de semanas indicado (0 si no hay datos).
   * Agrupa por nombre de producto / variedad / color (suma entre todas las fincas).
   */
  async getSemanal(
    semanaInicio?: number,
    semanaFin?: number,
    anio?: number,
  ): Promise<ConsolidadoSemanalRow[]> {
    type RawRow = {
      producto: string;
      variedad: string;
      color: string;
      numero_semana: string | null;
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
        bs.numero_semana,
        COALESCE(SUM(bs.cajas_estimadas), 0)  AS cajas_estimadas,
        COALESCE(SUM(bs.tallos_estimados), 0) AS tallos_estimados,
        COALESCE(SUM(bs.cajas_total), 0)      AS cajas_reales,
        COALESCE(SUM(bs.tallos_total), 0)     AS tallos_reales
      FROM colores c
      JOIN variedades v ON v.id = c.variedad_id
      JOIN productos  p ON p.id = v.producto_id
      LEFT JOIN base_semanal bs ON bs.color_id = c.id
        AND ($1::int IS NULL OR bs.numero_semana >= $1::int)
        AND ($2::int IS NULL OR bs.numero_semana <= $2::int)
        AND ($3::int IS NULL OR bs.anio           = $3::int)
      GROUP BY p.nombre, v.nombre, c.nombre, bs.numero_semana
      ORDER BY p.nombre, v.nombre, c.nombre, bs.numero_semana
      `,
      [semanaInicio ?? null, semanaFin ?? null, anio ?? null],
    );

    // Cuando un color no tiene ningún registro en el rango, el LEFT JOIN
    // devuelve una fila con numero_semana = null.  La mapeamos con
    // numeroSemana = 0 (centinela) para que el frontend pueda mostrar el
    // producto en la tabla aunque no tenga datos en ninguna semana.
    return rawRows.map((row) => ({
      producto: row.producto,
      variedad: row.variedad,
      color: row.color,
      numeroSemana: row.numero_semana !== null ? Number(row.numero_semana) : 0,
      cajasEstimadas: Math.round(Number(row.cajas_estimadas) * 100) / 100,
      tallosEstimados: Math.round(Number(row.tallos_estimados) * 100) / 100,
      cajasReales: Math.round(Number(row.cajas_reales) * 100) / 100,
      tallosReales: Math.round(Number(row.tallos_reales) * 100) / 100,
    }));
  }
}
