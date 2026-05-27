'use client';

import React from 'react';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTableScroll } from '@/lib/useTableScroll';
import { FloatingScrollbar } from '@/lib/FloatingScrollbar';

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

const WEEK_COUNT = 9;

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

// ── Componente ────────────────────────────────────────────────────────────────

export function ConsolidadoSemanal({ semanaInicio, semanaFin, anio }: Props) {
  const [viewMode, setViewMode] = useState<'cajas' | 'tallos'>('cajas');
  const isCajas = viewMode === 'cajas';
  const { scrollRef, isScrolled, canScrollRight, isVisible, scrollLeft, scrollRight } = useTableScroll(220);

  const { data: flat = [], isLoading } = useQuery<FlatRow[]>({
    queryKey: ['consolidado-semanal', semanaInicio, semanaFin, anio],
    queryFn: () =>
      api
        .get('/consolidado/semanal', { params: { semanaInicio, semanaFin, anio } })
        .then((r) => r.data),
  });

  // Siempre exactamente 10 semanas
  const weekCols: number[] = [];
  if (semanaInicio != null) {
    for (let s = semanaInicio; s < semanaInicio + WEEK_COUNT; s++) weekCols.push(s);
  } else {
    const set = new Set(flat.filter((r) => r.numeroSemana > 0).map((r) => r.numeroSemana));
    Array.from(set)
      .sort((a, b) => a - b)
      .slice(0, WEEK_COUNT)
      .forEach((s) => weekCols.push(s));
  }

  const allRows = pivotRows(flat);
  const groups = groupByProducto(allRows);

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

  const grandTotal = allRows.reduce(
    (acc, r) => ({
      cajasEst: acc.cajasEst + r.totalCajasEstimadas,
      cajasReal: acc.cajasReal + r.totalCajasReales,
      tallosEst: acc.tallosEst + r.totalTallosEstimados,
      tallosReal: acc.tallosReal + r.totalTallosReales,
    }),
    { cajasEst: 0, cajasReal: 0, tallosEst: 0, tallosReal: 0 },
  );

  // ── Excel ─────────────────────────────────────────────────────────────────

  const handleDownloadExcel = () => {
    const unit = isCajas ? 'Cajas' : 'Tallos';
    const headers = [
      'Producto', 'Variedad', 'Color',
      ...weekCols.flatMap((w) => [`S${w} ${unit} Est.`, `S${w} ${unit} Real`]),
      `Total ${unit} Est.`, `Total ${unit} Real`,
    ];
    const data = allRows.map((r) => [
      r.producto, r.variedad, r.color,
      ...weekCols.flatMap((w) => {
        const s = r.semanas[w];
        if (!s) return [0, 0];
        return isCajas
          ? [s.cajasEstimadas, s.cajasReales]
          : [s.tallosEstimados, s.tallosReales];
      }),
      isCajas ? r.totalCajasEstimadas : r.totalTallosEstimados,
      isCajas ? r.totalCajasReales : r.totalTallosReales,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado Semanal');
    const rango = semanaInicio
      ? `sem${semanaInicio}-${semanaInicio + WEEK_COUNT - 1}`
      : 'sem_all';
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
            onClick={() => setViewMode('cajas')}
            className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              isCajas
                ? 'bg-surface-raised text-carbon-50 shadow-sm'
                : 'text-carbon-400 hover:text-carbon-200'
            }`}
          >
            Cajas
          </button>
          <button
            onClick={() => setViewMode('tallos')}
            className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${
              !isCajas
                ? 'bg-surface-raised text-carbon-50 shadow-sm'
                : 'text-carbon-400 hover:text-carbon-200'
            }`}
          >
            Tallos
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={scrollLeft}
            disabled={!isScrolled}
            className="p-1.5 rounded border border-surface-border text-carbon-400 hover:text-carbon-200 hover:bg-surface-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Scroll left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            disabled={!canScrollRight}
            className="p-1.5 rounded border border-surface-border text-carbon-400 hover:text-carbon-200 hover:bg-surface-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Scroll right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
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

      {/* Tabla */}
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border border-surface-border scrollbar-always"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="min-w-max w-full text-xs">
          <thead>
            {/* Fila 1: número de semana */}
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th md:sticky md:left-0 z-20 bg-surface-overlay min-w-[130px]" rowSpan={2}>Producto</th>
              <th className="table-th md:sticky md:left-[130px] z-20 bg-surface-overlay min-w-[120px]" rowSpan={2}>Variedad</th>
              <th className={`table-th md:sticky md:left-[250px] z-20 bg-surface-overlay min-w-[110px] border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`} rowSpan={2}>Color</th>
              {weekCols.map((w) => (
                <th
                  key={w}
                  colSpan={2}
                  className="table-th text-center min-w-[120px] border-l border-surface-border/40 text-carbon-200"
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
            {/* Fila 2: Est. / Real por semana */}
            <tr className="bg-surface-overlay border-b border-surface-border">
              {weekCols.map((w) => (
                <React.Fragment key={w}>
                  <th className="table-th text-center text-[10px] font-normal text-dorado-400 border-l border-surface-border/40">
                    Est.
                  </th>
                  <th className="table-th text-center text-[10px] font-normal text-agro-400">
                    Real
                  </th>
                </React.Fragment>
              ))}
              <th className="table-th text-center text-[10px] font-normal text-dorado-400 border-l border-surface-border">
                Est.
              </th>
              <th className="table-th text-center text-[10px] font-normal text-agro-400">
                Real
              </th>
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => {
              const groupEst = group.rows.reduce(
                (s, r) => s + (isCajas ? r.totalCajasEstimadas : r.totalTallosEstimados),
                0,
              );
              const groupReal = group.rows.reduce(
                (s, r) => s + (isCajas ? r.totalCajasReales : r.totalTallosReales),
                0,
              );
              const hasData = group.rows.some((r) => Object.keys(r.semanas).length > 0);

              return (
                <React.Fragment key={`group-${group.producto}`}>
                  {/* Encabezado de grupo — Producto */}
                  <tr className="bg-surface-overlay border-t border-surface-border">
                    <td
                      colSpan={3}
                      className="px-3 py-1.5 md:sticky md:left-0 z-10 bg-surface-overlay"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-widest text-verde-400">
                        {group.producto}
                      </span>
                    </td>
                    <td
                      colSpan={weekCols.length * 2 + 2}
                      className="px-3 py-1.5 text-right"
                    >
                      <span className={`text-[10px] font-mono tabular-nums font-semibold ${hasData ? 'text-verde-300' : 'text-carbon-600'}`}>
                        {isCajas ? 'Cajas' : 'Tallos'} — Est.: {groupEst.toFixed(2)} · Real: {groupReal.toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  {/* Filas de variedad/color */}
                  {group.rows.map((row, i) => {
                    const sinDatos = Object.keys(row.semanas).length === 0;
                    const totalEst = isCajas ? row.totalCajasEstimadas : row.totalTallosEstimados;
                    const totalReal = isCajas ? row.totalCajasReales : row.totalTallosReales;
                    return (
                      <tr
                        key={`${row.producto}-${row.variedad}-${row.color}`}
                        className={`table-row-hover border-b border-surface-border/20 transition-opacity ${
                          sinDatos ? 'opacity-40' : ''
                        } ${i % 2 === 0 ? '' : 'bg-surface-overlay/10'}`}
                      >
                        <td className="px-3 py-2 text-carbon-700 whitespace-nowrap text-[11px] md:sticky md:left-0 z-10 bg-white min-w-[130px]" />
                        <td className="px-3 py-2 text-carbon-200 whitespace-nowrap md:sticky md:left-[130px] z-10 bg-white min-w-[120px]">{row.variedad}</td>
                        <td className={`px-3 py-2 font-medium text-carbon-100 whitespace-nowrap md:sticky md:left-[250px] z-10 bg-white min-w-[110px] border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}>{row.color}</td>
                        {weekCols.map((w) => {
                          const s = row.semanas[w];
                          const est = s ? (isCajas ? s.cajasEstimadas : s.tallosEstimados) : null;
                          const real = s ? (isCajas ? s.cajasReales : s.tallosReales) : null;
                          return (
                            <React.Fragment key={w}>
                              <td className="px-2 py-2 text-center font-mono tabular-nums text-dorado-500 border-l border-surface-border/20">
                                {est !== null && est > 0 ? est.toFixed(2) : <span className="text-carbon-700">—</span>}
                              </td>
                              <td className="px-2 py-2 text-center font-mono tabular-nums text-agro-500">
                                {real !== null && real > 0 ? real.toFixed(2) : <span className="text-carbon-700">—</span>}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {/* Total fila */}
                        <td className="px-2 py-2 text-center font-mono tabular-nums font-semibold text-dorado-400 border-l border-surface-border">
                          {totalEst > 0 ? totalEst.toFixed(2) : <span className="text-carbon-700">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center font-mono tabular-nums font-semibold text-agro-400">
                          {totalReal > 0 ? totalReal.toFixed(2) : <span className="text-carbon-700">—</span>}
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
                className={`px-3 py-2.5 text-xs font-semibold text-carbon-200 uppercase tracking-wide md:sticky md:left-0 z-10 bg-surface-overlay border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}
              >
                Total general
              </td>
              {weekCols.map((w) => {
                const ct = colTotals[w];
                const est = isCajas ? ct.cajasEstimadas : ct.tallosEstimados;
                const real = isCajas ? ct.cajasReales : ct.tallosReales;
                return (
                  <React.Fragment key={w}>
                    <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-dorado-400 border-l border-surface-border/30">
                      {est > 0 ? est.toFixed(2) : <span className="text-carbon-600">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-agro-400">
                      {real > 0 ? real.toFixed(2) : <span className="text-carbon-600">—</span>}
                    </td>
                  </React.Fragment>
                );
              })}
              <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-dorado-400 border-l border-surface-border">
                {(isCajas ? grandTotal.cajasEst : grandTotal.tallosEst).toFixed(2)}
              </td>
              <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-agro-400">
                {(isCajas ? grandTotal.cajasReal : grandTotal.tallosReal).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <FloatingScrollbar scrollRef={scrollRef} isVisible={isVisible} />
    </div>
  );
}
