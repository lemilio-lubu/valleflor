import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroDiario, DiaSemana } from '../registros/registro-diario.entity';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';

type ParticipacionColorRawRow = {
  producto: string;
  color: string;
  numero_semana: string | null;
  cajas: string;
  es_real: boolean;
  participacion: string | null;
};

export interface ParticipacionColorRow {
  producto: string;
  color: string;
  numeroSemana: number;
  cajas: number;
  /** false cuando la semana aún no tiene dato real y se usó el estimado */
  esReal: boolean;
  participacion: number | null;
}

export interface DiaData {
  cajas: number;
  tallos: number;
}

export interface ConsolidadoDiarioRow {
  producto: string;
  variedad: string;
  color: string;
  codigo: string | null;
  nombreComercial: string | null;
  dias: Partial<Record<DiaSemana, DiaData>>;
  totalCajas: number;
  totalTallos: number;
}

/** Una fila plana por (producto, variedad, color, semana) para que el frontend construya la matriz */
export interface ConsolidadoSemanalRow {
  producto: string;
  variedad: string;
  color: string;
  codigo: string | null;
  nombreComercial: string | null;
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
      codigo: string | null;
      nombre_comercial: string | null;
      dia: string | null;
      cajas: string;
      tallos: string;
    };

    const rawRows = await this.registroRepo.manager.query<RawRow[]>(
      `
      SELECT
        p.nombre  AS producto,
        v.nombre  AS variedad,
        c.nombre  AS color,
        c.codigo  AS codigo,
        c.nombre_comercial AS nombre_comercial,
        rd.dia    AS dia,
        COALESCE(SUM(rd.cajas), 0)  AS cajas,
        COALESCE(SUM(rd.cajas * c.tallos_por_caja), 0) AS tallos
      FROM colores c
      JOIN variedades v ON v.id = c.variedad_id
      JOIN productos  p ON p.id = v.producto_id
      LEFT JOIN (
        SELECT rd.color_id, rd.dia, rd.cajas, rd.tallos
        FROM registros_diarios rd
        JOIN semanas s ON s.id = rd.semana_id
          AND ($1::int IS NULL OR s.numero_semana = $1::int)
          AND ($2::int IS NULL OR s.anio           = $2::int)
      ) rd ON rd.color_id = c.id
      WHERE c.activo = true
        AND v.activo = true
        AND p.activo = true
      GROUP BY p.nombre, v.nombre, c.nombre, c.codigo, c.nombre_comercial, rd.dia
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
          codigo: row.codigo,
          nombreComercial: row.nombre_comercial,
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
      codigo: string | null;
      nombre_comercial: string | null;
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
        c.codigo AS codigo,
        c.nombre_comercial AS nombre_comercial,
        bs.numero_semana,
        COALESCE(SUM(bs.cajas_estimadas), 0)  AS cajas_estimadas,
        COALESCE(SUM(bs.cajas_estimadas * c.tallos_por_caja), 0) AS tallos_estimados,
        COALESCE(SUM(bs.cajas_total), 0)      AS cajas_reales,
        COALESCE(SUM(bs.cajas_total * c.tallos_por_caja), 0)     AS tallos_reales
      FROM colores c
      JOIN variedades v ON v.id = c.variedad_id
      JOIN productos  p ON p.id = v.producto_id
      LEFT JOIN base_semanal bs ON bs.color_id = c.id
        AND ($1::int IS NULL OR bs.numero_semana >= $1::int)
        AND ($2::int IS NULL OR bs.numero_semana <= $2::int)
        AND ($3::int IS NULL OR bs.anio           = $3::int)
      WHERE c.activo = true
        AND v.activo = true
        AND p.activo = true
      GROUP BY p.nombre, v.nombre, c.nombre, c.codigo, c.nombre_comercial, bs.numero_semana
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
      codigo: row.codigo,
      nombreComercial: row.nombre_comercial,
      numeroSemana: row.numero_semana !== null ? Number(row.numero_semana) : 0,
      cajasEstimadas: Math.round(Number(row.cajas_estimadas) * 100) / 100,
      tallosEstimados: Math.round(Number(row.tallos_estimados) * 100) / 100,
      cajasReales: Math.round(Number(row.cajas_reales) * 100) / 100,
      tallosReales: Math.round(Number(row.tallos_reales) * 100) / 100,
    }));
  }

  /**
   * Participación por color — muestra TODOS los nombres de color activos con su
   * porcentaje de participación dentro del total de cajas del producto en cada
   * semana del rango indicado.
   * Se agrupa por nombre de color únicamente (ignorando la variedad), porque
   * un mismo nombre de color puede repetirse en variedades distintas del
   * mismo producto y debe contarse una sola vez.
   * Por semana usa el dato real (cajas_total) si ya está disponible
   * (base_semanal.es_real = true); si la semana todavía no tiene dato real
   * (es futura), usa el estimado (cajas_estimadas) para poder proyectar la
   * participación igual.
   * Colores sin registros en el rango devuelven numeroSemana = 0 (centinela).
   */
  async getParticipacionColor(
    semanaInicio?: number,
    semanaFin?: number,
    anio?: number,
  ): Promise<ParticipacionColorRow[]> {
    const rawRows = await this.baseSemanalRepo.manager.query<ParticipacionColorRawRow[]>(
      `SELECT
  p.nombre AS producto,
  c.nombre AS color,
  bs.numero_semana,
  BOOL_AND(COALESCE(bs.es_real, true)) AS es_real,
  COALESCE(SUM(CASE WHEN bs.es_real THEN bs.cajas_total ELSE bs.cajas_estimadas END), 0) AS cajas,
  SUM(CASE WHEN bs.es_real THEN bs.cajas_total ELSE bs.cajas_estimadas END) * 100.0
    / NULLIF(
        SUM(SUM(CASE WHEN bs.es_real THEN bs.cajas_total ELSE bs.cajas_estimadas END))
          OVER (PARTITION BY p.nombre, bs.numero_semana),
        0
      ) AS participacion
FROM colores c
JOIN variedades v ON v.id = c.variedad_id
JOIN productos  p ON p.id = v.producto_id
LEFT JOIN base_semanal bs ON bs.color_id = c.id
  AND ($1::int IS NULL OR bs.numero_semana >= $1::int)
  AND ($2::int IS NULL OR bs.numero_semana <= $2::int)
  AND ($3::int IS NULL OR bs.anio           = $3::int)
WHERE c.activo = true
  AND v.activo = true
  AND p.activo = true
GROUP BY p.nombre, c.nombre, bs.numero_semana
ORDER BY p.nombre, c.nombre, bs.numero_semana`,
      [semanaInicio ?? null, semanaFin ?? null, anio ?? null],
    );

    return rawRows.map((row) => ({
      producto: row.producto,
      color: row.color,
      numeroSemana: row.numero_semana !== null ? Number(row.numero_semana) : 0,
      cajas: Math.round(Number(row.cajas) * 100) / 100,
      esReal: row.es_real,
      participacion:
        row.participacion !== null
          ? Math.round(Number(row.participacion) * 100) / 100
          : null,
    }));
  }
}
