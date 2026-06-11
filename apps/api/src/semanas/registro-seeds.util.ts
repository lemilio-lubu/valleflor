import { DiaSemana } from '../registros/registro-diario.entity';

// Mapea JS Date.getUTCDay() (0=Dom … 6=Sab) al enum DiaSemana
const DIA_BY_JS_DAY: DiaSemana[] = [
  DiaSemana.DOMINGO,
  DiaSemana.LUNES,
  DiaSemana.MARTES,
  DiaSemana.MIERCOLES,
  DiaSemana.JUEVES,
  DiaSemana.VIERNES,
  DiaSemana.SABADO,
];

export const DIA_SORT_ORDER: Record<DiaSemana, number> = {
  [DiaSemana.DOMINGO]: 0,
  [DiaSemana.LUNES]: 1,
  [DiaSemana.MARTES]: 2,
  [DiaSemana.MIERCOLES]: 3,
  [DiaSemana.JUEVES]: 4,
  [DiaSemana.VIERNES]: 5,
  [DiaSemana.SABADO]: 6,
};

/** Datos mínimos para crear un RegistroDiario en blanco (0 cajas). */
export interface RegistroSeed {
  semanaId: string;
  colorId: string;
  dia: DiaSemana;
  fecha: string;
  cajas: number;
  divisorTallos: number;
  tallos: number;
}

/**
 * Genera los 7 registros diarios en blanco para un color dentro de una semana,
 * uno por cada día a partir de `fechaInicio` (YYYY-MM-DD).
 */
export function buildRegistroSeeds(
  semanaId: string,
  fechaInicio: string,
  colorId: string,
  divisorTallos: number,
): RegistroSeed[] {
  const fechaBase = new Date(fechaInicio + 'T00:00:00Z');
  const seeds: RegistroSeed[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(fechaBase);
    d.setUTCDate(d.getUTCDate() + i);
    const dia = DIA_BY_JS_DAY[d.getUTCDay()];
    const fecha = d.toISOString().split('T')[0];
    seeds.push({ semanaId, colorId, dia, fecha, cajas: 0, divisorTallos, tallos: 0 });
  }
  return seeds;
}
