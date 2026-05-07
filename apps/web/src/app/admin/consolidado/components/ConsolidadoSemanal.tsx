'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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

interface PivotRow {
  producto: string;
  variedad: string;
  color: string;
  /** semana → valores */
  semanas: Record<
    number,
    { cajasEstimadas: number; tallosEstimados: number; cajasReales: number; tallosReales: number }
  >;
  totalCajasEstimadas: number;
  totalTallosEstimados: number;
  totalCajasReales: number;
  totalTallosReales: number;
}

interface Props {
  semanaInicio?: number;
  semanaFin?: number;
  anio?: number;
}

// ── Helper: pivotear filas planas en filas × semanas ─────────────────────────

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

  // Columnas de semanas (rango continuo que el usuario seleccionó)
  const weekCols: number[] = [];
  if (semanaInicio != null && semanaFin != null) {
    for (let s = semanaInicio; s <= semanaFin; s++) weekCols.push(s);
  } else {
    // Si no hay rango definido, derivar de los datos recibidos
    const semanasSet = new Set(flat.map((r) => r.numeroSemana));
    semanasSet.forEach((s) => weekCols.push(s));
    weekCols.sort((a, b) => a - b);
  }

  const rows = pivotRows(flat);

  // Totales por columna (semana)
  const colTotals: Record<
    number,
    { cajasEstimadas: number; tallosEstimados: number; cajasReales: number; tallosReales: number }
  > = {};
  for (const w of weekCols) {
    colTotals[w] = { cajasEstimadas: 0, tallosEstimados: 0, cajasReales: 0, tallosReales: 0 };
    for (const row of rows) {
      const s = row.semanas[w];
      if (s) {
        colTotals[w].cajasEstimadas += s.cajasEstimadas;
        colTotals[w].tallosEstimados += s.tallosEstimados;
        colTotals[w].cajasReales += s.cajasReales;
        colTotals[w].tallosReales += s.tallosReales;
      }
    }
  }

  const grandTotalEst = rows.reduce(
    (acc, r) => ({
      cajas: acc.cajas + r.totalCajasEstimadas,
      tallos: acc.tallos + r.totalTallosEstimados,
    }),
    { cajas: 0, tallos: 0 },
  );
  const grandTotalReal = rows.reduce(
    (acc, r) => ({
      cajas: acc.cajas + r.totalCajasReales,
      tallos: acc.tallos + r.totalTallosReales,
    }),
    { cajas: 0, tallos: 0 },
  );

  // ── Excel ──────────────────────────────────────────────────────────────────

  const handleDownloadExcel = () => {
    const isEst = viewMode === 'estimado';
    const headers = [
      'Producto',
      'Variedad',
      'Color',
      ...weekCols.map((w) => `S${w}`),
      'Total',
    ];
    const data = rows.map((r) => [
      r.producto,
      r.variedad,
      r.color,
      ...weekCols.map((w) => {
        const s = r.semanas[w];
        if (!s) return 0;
        return isEst
          ? (viewMode === 'estimado' ? s.cajasEstimadas : s.tallosEstimados)
          : (viewMode === 'estimado' ? s.cajasReales : s.tallosReales);
      }),
      isEst ? r.totalCajasEstimadas : r.totalCajasReales,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado Semanal');
    const rango =
      semanaInicio && semanaFin
        ? `sem${semanaInicio}-${semanaFin}`
        : `sem_all`;
    XLSX.writeFile(wb, `consolidado_semanal_${rango}_${anio ?? ''}.xlsx`);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        Sin datos semanales para el rango seleccionado
      </div>
    );
  }

  const isEst = viewMode === 'estimado';

  // Valor de una semana para una fila (según viewMode)
  const getVal = (
    s: { cajasEstimadas: number; tallosEstimados: number; cajasReales: number; tallosReales: number } | undefined,
    mode: 'estimado' | 'real',
    unit: 'cajas' | 'tallos',
  ): number | null => {
    if (!s) return null;
    if (mode === 'estimado') return unit === 'cajas' ? s.cajasEstimadas : s.tallosEstimados;
    return unit === 'cajas' ? s.cajasReales : s.tallosReales;
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Toggle estimado / real */}
        <div className="flex gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border w-fit">
          <button
            onClick={() => setViewMode('estimado')}
            className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'estimado'
                ? 'bg-surface-raised text-carbon-50 shadow-sm'
                : 'text-carbon-400 hover:text-carbon-200'
              }`}
          >
            Estimado
          </button>
          <button
            onClick={() => setViewMode('real')}
            className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'real'
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

      {/* Matriz */}
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="min-w-max w-full text-xs">
          <thead>
            {/* Sub-headers: cajas y tallos por semana */}
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th min-w-[140px]" rowSpan={2}>Producto</th>
              <th className="table-th min-w-[120px]" rowSpan={2}>Variedad</th>
              <th className="table-th min-w-[110px]" rowSpan={2}>Color</th>
              {weekCols.map((w) => (
                <th
                  key={w}
                  colSpan={2}
                  className={`table-th text-center min-w-[120px] border-l border-surface-border/40 ${isEst ? 'text-dorado-400' : 'text-agro-400'
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
            <tr className="bg-surface-overlay border-b border-surface-border">
              {weekCols.map((w) => (
                <>
                  <th
                    key={`${w}-cajas`}
                    className="table-th text-center text-[10px] font-normal text-carbon-400 border-l border-surface-border/40"
                  >
                    Cajas
                  </th>
                  <th
                    key={`${w}-tallos`}
                    className="table-th text-center text-[10px] font-normal text-carbon-400"
                  >
                    Tallos
                  </th>
                </>
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
            {rows.map((row, i) => (
              <tr
                key={`${row.producto}-${row.variedad}-${row.color}`}
                className={`table-row-hover border-b border-surface-border/30 ${i % 2 === 0 ? '' : 'bg-surface-overlay/15'
                  }`}
              >
                <td className="px-3 py-2 text-carbon-50 whitespace-nowrap">{row.producto}</td>
                <td className="px-3 py-2 text-carbon-50 whitespace-nowrap">{row.variedad}</td>
                <td className="px-3 py-2 font-medium text-carbon-50 whitespace-nowrap">
                  {row.color}
                </td>
                {weekCols.map((w) => {
                  const s = row.semanas[w];
                  const cajas = getVal(s, viewMode, 'cajas');
                  const tallos = getVal(s, viewMode, 'tallos');
                  return (
                    <>
                      <td
                        key={`${w}-cajas`}
                        className={`px-2 py-2 text-center font-mono tabular-nums border-l border-surface-border/20 ${isEst ? 'text-dorado-500' : 'text-agro-500'
                          }`}
                      >
                        {cajas !== null && cajas > 0 ? (
                          cajas.toFixed(2)
                        ) : (
                          <span className="text-carbon-600">—</span>
                        )}
                      </td>
                      <td
                        key={`${w}-tallos`}
                        className={`px-2 py-2 text-center font-mono tabular-nums ${isEst ? 'text-dorado-400/70' : 'text-agro-400/70'
                          }`}
                      >
                        {tallos !== null && tallos > 0 ? (
                          tallos.toFixed(0)
                        ) : (
                          <span className="text-carbon-600">—</span>
                        )}
                      </td>
                    </>
                  );
                })}
                {/* Total de la fila */}
                <td className="px-2 py-2 text-center font-mono tabular-nums font-semibold text-verde-400 border-l border-surface-border">
                  {(isEst ? row.totalCajasEstimadas : row.totalCajasReales).toFixed(2)}
                </td>
                <td className="px-2 py-2 text-center font-mono tabular-nums font-semibold text-verde-300">
                  {(isEst ? row.totalTallosEstimados : row.totalTallosReales).toFixed(0)}
                </td>
              </tr>
            ))}
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
                  <>
                    <td
                      key={`${w}-cajas-foot`}
                      className={`px-2 py-2.5 text-center font-mono tabular-nums font-bold border-l border-surface-border/30 ${isEst ? 'text-dorado-400' : 'text-agro-400'
                        }`}
                    >
                      {cajas > 0 ? cajas.toFixed(2) : <span className="text-carbon-600">—</span>}
                    </td>
                    <td
                      key={`${w}-tallos-foot`}
                      className={`px-2 py-2.5 text-center font-mono tabular-nums font-bold ${isEst ? 'text-dorado-300' : 'text-agro-300'
                        }`}
                    >
                      {tallos > 0 ? tallos.toFixed(0) : <span className="text-carbon-600">—</span>}
                    </td>
                  </>
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
      );
  }
      );
