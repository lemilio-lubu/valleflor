import { now as clockNow } from './clock';

/**
 * Devuelve la semana ISO 8601 (1-53) y el año al que pertenece la fecha actual.
 * El jueves de la semana determina el año ISO.
 */
export function getCurrentISOWeek(): { numeroSemana: number; anio: number } {
  const now = clockNow();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { numeroSemana: weekNum, anio: d.getUTCFullYear() };
}

/** Genera `count` semanas consecutivas a partir de (startWeek, startYear). */
export function getNextWeeks(
  startWeek: number,
  startYear: number,
  count: number,
): Array<{ anio: number; numeroSemana: number }> {
  const weeks: Array<{ anio: number; numeroSemana: number }> = [];
  let w = startWeek;
  let y = startYear;
  for (let i = 0; i < count; i++) {
    weeks.push({ anio: y, numeroSemana: w });
    w++;
    if (w > 52) {
      // Asumimos 52 por simplicidad, aunque algunas tienen 53
      w = 1;
      y++;
    }
  }
  return weeks;
}

/**
 * Indica si (anio, numeroSemana) es la semana ISO actual o una futura,
 * tomando como referencia la semana del servidor.
 */
export function isCurrentOrFutureWeek(anio: number, numeroSemana: number): boolean {
  const current = getCurrentISOWeek();
  return (
    anio > current.anio ||
    (anio === current.anio && numeroSemana >= current.numeroSemana)
  );
}
