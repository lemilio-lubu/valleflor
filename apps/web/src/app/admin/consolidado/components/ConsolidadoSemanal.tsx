'use client';

import React from 'react';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface FlatRow {
  producto: string;
  variedad: string;
  color: string;
  numeroSemana: number;
  cajasEstimadas: number;
  tallosEstimados: number;
  cajasReales: number;
  tallosReales: number;
}

interface SemanaData {
  cajasEstimadas: number;
  tallosEstimados: number;
  cajasReales: number;
  tallosReales: number;
}

interface PivotRow {
  producto: string;
  variedad: string;
  color: string;
  semanas: Record<number, SemanaData>;
  totalCajasEstimadas: number;
  totalTallosEstimados: number;
  totalCajasReales: number;
  totalTallosReales: number;
}

interface ProductGroup {
  producto: string;
  rows: PivotRow[];
}

interface Props {
  semanaInicio?: number;
  semanaFin?: number;
  anio?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pivotRows(flat: FlatRow[]): PivotRow[] {
  const map = new Map<string, PivotRow>();
  for (const row of flat) {
    const key = `${row.producto}||${row.variedad}||${row.color}`;
    if (!map.has(key)) {
      map.set(key, {
        producto: row.producto,
        variedad: row.variedad,
        color: row.color,
        semanas: {},
        totalCajasEstimadas: 0,
        totalTallosEstimados: 0,
        totalCajasReales: 0,
        totalTallosReales: 0,
      });
    }
    // numeroSemana === 0 es el centinela "producto en catálogo sin datos semanales"
    // Solo registramos en semanas si hay un número de semana real
    if (row.numeroSemana === 0) continue;

    const entry = map.get(key)!;
    entry.semanas[row.numeroSemana] = {
      cajasEstimadas: row.cajasEstimadas,
      tallosEstimados: row.tallosEstimados,
      cajasReales: row.cajasReales,
      tallosReales: row.tallosReales,
    };
    entry.totalCajasEstimadas =
      Math.round((entry.totalCajasEstimadas + row.cajasEstimadas) * 100) / 100;
    entry.totalTallosEstimados =
      Math.round((entry.totalTallosEstimados + row.tallosEstimados) * 100) / 100;
    entry.totalCajasReales =
      Math.round((entry.totalCajasReales + row.cajasReales) * 100) / 100;
    entry.totalTallosReales =
      Math.round((entry.totalTallosReales + row.tallosReales) * 100) / 100;
  }
  return Array.from(map.values());
}

function groupByProducto(rows: PivotRow[]): ProductGroup[] {
  const map = new Map<string, PivotRow[]>();
  for (const row of rows) {
    if (!map.has(row.producto)) map.set(row.producto, []);
    map.get(row.producto)!.push(row);
  }
  return Array.from(map.entries()).map(([producto, rows]) => ({ producto, rows }));
}

function getVal(s: SemanaData | undefined, mode: 'estimado' | 'real', unit: 'cajas' | 'tallos'): number | null {
  if (!s) return null;
  if (mode === 'estimado') return unit === 'cajas' ? s.cajasEstimadas : s.tallosEstimados;
  return unit === 'cajas' ? s.cajasReales : s.tallosReales;
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ConsolidadoSemanal({ semanaInicio, semanaFin, anio }: Props) {
  const [viewMode, setViewMode] = useState<'estimado' | 'real'>('estimado');

  const { data: flat = [], isLoading } = useQuery<FlatRow[]>({
    queryKey: ['consolidado-semanal', semanaInicio, semanaFin, anio],
    queryFn: () =>
      api
        .get('/consolidado/semanal', { params: { semanaInicio, semanaFin, anio } })
        .then((r) => r.data),
  });

  // Columnas de semanas
  const weekCols: number[] = [];
  if (semanaInicio != null && semanaFin != null) {
    for (let s = semanaInicio; s <= semanaFin; s++) weekCols.push(s);
  } else {
    const set = new Set(flat.map((r) => r.numeroSemana));
    set.forEach((s) => weekCols.push(s));
    weekCols.sort((a, b) => a - b);
  }

  const allRows = pivotRows(flat);
  const groups = groupByProducto(allRows);
  const isEst = viewMode === 'estimado';

  // Totales por columna (sobre todas las filas)
  const colTotals: Record<number, SemanaData> = {};
  for (const w of weekCols) {
    colTotals[w] = { cajasEstimadas: 0, tallosEstimados: 0, cajasReales: 0, tallosReales: 0 };
    for (const row of allRows) {
      const s = row.semanas[w];
      if (s) {
        colTotals[w].cajasEstimadas += s.cajasEstimadas;
        colTotals[w].tallosEstimados += s.tallosEstimados;
        colTotals[w].cajasReales += s.cajasReales;
        colTotals[w].tallosReales += s.tallosReales;
      }
    }
  }

  const grandTotalEst = allRows.reduce(
    (acc, r) => ({ cajas: acc.cajas + r.totalCajasEstimadas, tallos: acc.tallos + r.totalTallosEstimados }),
    { cajas: 0, tallos: 0 },
  );
  const grandTotalReal = allRows.reduce(
    (acc, r) => ({ cajas: acc.cajas + r.totalCajasReales, tallos: acc.tallos + r.totalTallosReales }),
    { cajas: 0, tallos: 0 },
  );

  // ── Excel ─────────────────────────────────────────────────────────────────

  const handleDownloadExcel = () => {
    const headers = [
      'Producto', 'Variedad', 'Color',
      ...weekCols.flatMap((w) => [`S${w} Cajas`, `S${w} Tallos`]),
      'Total Cajas', 'Total Tallos',
    ];
    const data = allRows.map((r) => [
      r.producto, r.variedad, r.color,
      ...weekCols.flatMap((w) => {
        const s = r.semanas[w];
        if (!s) return [0, 0];
        return isEst ? [s.cajasEstimadas, s.tallosEstimados] : [s.cajasReales, s.tallosReales];
      }),
      isEst ? r.totalCajasEstimadas : r.totalCajasReales,
      isEst ? r.totalTallosEstimados : r.totalTallosReales,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado Semanal');
    const rango = semanaInicio && semanaFin ? `sem${semanaInicio}-${semanaFin}` : 'sem_all';
    XLSX.writeFile(wb, `consolidado_semanal_${rango}_${anio ?? ''}.xlsx`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-9 bg-surface-overlay rounded animate-pulse"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    );
  }

  if (allRows.length === 0) {
    return (
      <div className="empty-state">
        Sin datos semanales para el rango seleccionado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border w-fit">
          <button
            onClick={() => setViewMode('estimado')}
            className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              isEst
                ? 'bg-surface-raised text-carbon-50 shadow-sm'
                : 'text-carbon-400 hover:text-carbon-200'
            }`}
          >
            Estimado
          </button>
          <button
            onClick={() => setViewMode('real')}
            className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              !isEst
                ? 'bg-surface-raised text-carbon-50 shadow-sm'
                : 'text-carbon-400 hover:text-carbon-200'
            }`}
          >
            Real
          </button>
        </div>

        <button
          onClick={handleDownloadExcel}
          className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Excel
        </button>
      </div>

      {/* Tabla matriz */}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="min-w-max w-full text-xs">
          <thead>
            {/* Fila 1: nombres de semana */}
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th min-w-[130px]" rowSpan={2}>Producto</th>
              <th className="table-th min-w-[120px]" rowSpan={2}>Variedad</th>
              <th className="table-th min-w-[110px]" rowSpan={2}>Color</th>
              {weekCols.map((w) => (
                <th
                  key={w}
                  colSpan={2}
                  className={`table-th text-center min-w-[120px] border-l border-surface-border/40 ${
                    isEst ? 'text-dorado-400' : 'text-agro-400'
                  }`}
                >
                  Sem {w}
                </th>
              ))}
              <th
                colSpan={2}
                className="table-th text-center min-w-[120px] border-l border-surface-border text-verde-400"
              >
                Total
              </th>
            </tr>
            {/* Fila 2: Cajas / Tallos por semana */}
            <tr className="bg-surface-overlay border-b border-surface-border">
              {weekCols.map((w) => (
                <React.Fragment key={w}>
                  <th className="table-th text-center text-[10px] font-normal text-carbon-400 border-l border-surface-border/40">
                    Cajas
                  </th>
                  <th className="table-th text-center text-[10px] font-normal text-carbon-400">
                    Tallos
                  </th>
                </React.Fragment>
              ))}
              <th className="table-th text-center text-[10px] font-normal text-carbon-400 border-l border-surface-border">
                Cajas
              </th>
              <th className="table-th text-center text-[10px] font-normal text-carbon-400">
                Tallos
              </th>
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => {
              // Totales del grupo para el encabezado
              const groupCajas = group.rows.reduce(
                (s, r) => s + (isEst ? r.totalCajasEstimadas : r.totalCajasReales),
                0,
              );
              const groupTallos = group.rows.reduce(
                (s, r) => s + (isEst ? r.totalTallosEstimados : r.totalTallosReales),
                0,
              );
              const hasData = group.rows.some(
                (r) => Object.keys(r.semanas).length > 0,
              );

              return (
                <React.Fragment key={`group-${group.producto}`}>
                  {/* Encabezado de grupo — Producto */}
                  <tr className="bg-surface-overlay/60 border-t border-surface-border">
                    <td
                      colSpan={3 + weekCols.length * 2 + 2}
                      className="px-3 py-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-verde-400">
                          {group.producto}
                        </span>
                        <span className={`text-[10px] font-mono tabular-nums font-semibold ${hasData ? 'text-verde-300' : 'text-carbon-600'}`}>
                          {isEst ? 'Est.' : 'Real'} — Cajas: {groupCajas.toFixed(2)} · Tallos: {groupTallos.toFixed(0)}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* Filas de variedad/color */}
                  {group.rows.map((row, i) => {
                    const sinDatos = Object.keys(row.semanas).length === 0;
                    return (
                      <tr
                        key={`${row.producto}-${row.variedad}-${row.color}`}
                        className={`table-row-hover border-b border-surface-border/20 transition-opacity ${
                          sinDatos ? 'opacity-40' : ''
                        } ${i % 2 === 0 ? '' : 'bg-surface-overlay/10'}`}
                      >
                        {/* Celda Producto vacía — ya aparece en encabezado */}
                        <td className="px-3 py-2 text-carbon-700 whitespace-nowrap text-[11px]" />
                        <td className="px-3 py-2 text-carbon-200 whitespace-nowrap">{row.variedad}</td>
                        <td className="px-3 py-2 font-medium text-carbon-100 whitespace-nowrap">{row.color}</td>
                        {weekCols.map((w) => {
                          const s = row.semanas[w];
                          const cajas = getVal(s, viewMode, 'cajas');
                          const tallos = getVal(s, viewMode, 'tallos');
                          return (
                            <React.Fragment key={w}>
                              <td className={`px-2 py-2 text-center font-mono tabular-nums border-l border-surface-border/20 ${
                                isEst ? 'text-dorado-500' : 'text-agro-500'
                              }`}>
                                {cajas !== null && cajas > 0 ? cajas.toFixed(2) : <span className="text-carbon-700">—</span>}
                              </td>
                              <td className={`px-2 py-2 text-center font-mono tabular-nums ${
                                isEst ? 'text-dorado-400/70' : 'text-agro-400/70'
                              }`}>
                                {tallos !== null && tallos > 0 ? tallos.toFixed(0) : <span className="text-carbon-700">—</span>}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {/* Total fila */}
                        <td className="px-2 py-2 text-center font-mono tabular-nums font-semibold text-verde-400 border-l border-surface-border">
                          {(isEst ? row.totalCajasEstimadas : row.totalCajasReales) > 0
                            ? (isEst ? row.totalCajasEstimadas : row.totalCajasReales).toFixed(2)
                            : <span className="text-carbon-700">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center font-mono tabular-nums font-semibold text-verde-300">
                          {(isEst ? row.totalTallosEstimados : row.totalTallosReales) > 0
                            ? (isEst ? row.totalTallosEstimados : row.totalTallosReales).toFixed(0)
                            : <span className="text-carbon-700">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-surface-border bg-surface-overlay">
              <td
                colSpan={3}
                className="px-3 py-2.5 text-xs font-semibold text-carbon-200 uppercase tracking-wide"
              >
                Total general
              </td>
              {weekCols.map((w) => {
                const ct = colTotals[w];
                const cajas = isEst ? ct.cajasEstimadas : ct.cajasReales;
                const tallos = isEst ? ct.tallosEstimados : ct.tallosReales;
                return (
                  <React.Fragment key={w}>
                    <td className={`px-2 py-2.5 text-center font-mono tabular-nums font-bold border-l border-surface-border/30 ${
                      isEst ? 'text-dorado-400' : 'text-agro-400'
                    }`}>
                      {cajas > 0 ? cajas.toFixed(2) : <span className="text-carbon-600">—</span>}
                    </td>
                    <td className={`px-2 py-2.5 text-center font-mono tabular-nums font-bold ${
                      isEst ? 'text-dorado-300' : 'text-agro-300'
                    }`}>
                      {tallos > 0 ? tallos.toFixed(0) : <span className="text-carbon-600">—</span>}
                    </td>
                  </React.Fragment>
                );
              })}
              <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-verde-400 border-l border-surface-border">
                {(isEst ? grandTotalEst.cajas : grandTotalReal.cajas).toFixed(2)}
              </td>
              <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-verde-300">
                {(isEst ? grandTotalEst.tallos : grandTotalReal.tallos).toFixed(0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
