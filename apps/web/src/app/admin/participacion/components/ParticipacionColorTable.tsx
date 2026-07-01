'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTableScroll } from '@/lib/useTableScroll';
import { FloatingScrollbar } from '@/lib/FloatingScrollbar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface FlatRow {
  producto: string;
  color: string;
  numeroSemana: number;
  cajas: number;
  /** false cuando la semana aún no tiene dato real y se muestra el estimado */
  esReal: boolean;
  participacion: number | null;
}

interface SemanaPart {
  cajas: number;
  esReal: boolean;
  participacion: number | null;
}

interface PivotRowP {
  producto: string;
  color: string;
  semanas: Record<number, SemanaPart>;
  totalCajas: number;
}

interface ProductGroup {
  producto: string;
  rows: PivotRowP[];
}

interface Props {
  semanaInicio?: number;
  semanaFin?: number;
  anio?: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEK_COUNT = 10;

// ── Helpers ───────────────────────────────────────────────────────────────────

function pivotParticipacion(flat: FlatRow[]): PivotRowP[] {
  const map = new Map<string, PivotRowP>();
  for (const row of flat) {
    const key = `${row.producto}||${row.color}`;
    if (!map.has(key)) {
      map.set(key, {
        producto: row.producto,
        color: row.color,
        semanas: {},
        totalCajas: 0,
      });
    }
    if (row.numeroSemana === 0) continue;
    const entry = map.get(key)!;
    entry.semanas[row.numeroSemana] = {
      cajas: row.cajas,
      esReal: row.esReal,
      participacion: row.participacion,
    };
    entry.totalCajas = Math.round((entry.totalCajas + row.cajas) * 100) / 100;
  }
  return Array.from(map.values());
}

function groupByProducto(rows: PivotRowP[]): ProductGroup[] {
  const map = new Map<string, PivotRowP[]>();
  for (const row of rows) {
    if (!map.has(row.producto)) map.set(row.producto, []);
    map.get(row.producto)!.push(row);
  }
  return Array.from(map.entries()).map(([producto, rows]) => ({ producto, rows }));
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ParticipacionColorTable({ semanaInicio, semanaFin, anio }: Props) {
  const { scrollRef, isScrolled, canScrollRight, isVisible, scrollLeft, scrollRight } =
    useTableScroll(220);

  const effectiveSemanaFin =
    semanaInicio != null && semanaFin != null
      ? Math.max(semanaFin, semanaInicio + WEEK_COUNT - 1)
      : semanaFin;

  const { data: flat = [], isLoading } = useQuery<FlatRow[]>({
    queryKey: ['participacion-color', semanaInicio, effectiveSemanaFin, anio],
    queryFn: () =>
      api
        .get('/consolidado/participacion-color', {
          params: { semanaInicio, semanaFin: effectiveSemanaFin, anio },
        })
        .then((r) => r.data),
  });

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

  const allRows = pivotParticipacion(flat);
  const groups = groupByProducto(allRows);

  // ── Loading ────────────────────────────────────────────────────────────────

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

  // ── Empty state ────────────────────────────────────────────────────────────

  if (allRows.length === 0) {
    return (
      <div className="empty-state animate-fade-in">
        Sin datos de participación para el rango seleccionado
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Scroll controls */}
      <div className="flex items-center justify-end gap-1">
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

      {/* Table */}
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border border-surface-border scrollbar-always"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="min-w-max w-full text-xs">
          <thead>
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th md:sticky md:left-0 z-20 bg-surface-overlay min-w-[130px]">
                Producto
              </th>
              <th
                className={`table-th md:sticky md:left-[130px] z-20 bg-surface-overlay min-w-[110px] border-r border-surface-border transition-shadow ${
                  isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''
                }`}
              >
                Color
              </th>
              {weekCols.map((w) => (
                <th
                  key={w}
                  className="table-th text-center min-w-[90px] border-l border-surface-border/40 text-carbon-200"
                >
                  Sem {w}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => {
              const groupWeekTotals = weekCols.map((w) => {
                let cajas = 0;
                for (const r of group.rows) {
                  const s = r.semanas[w];
                  if (s) cajas += s.cajas;
                }
                return { w, cajas };
              });

              return (
                <React.Fragment key={`group-${group.producto}`}>
                  {/* Group header row */}
                  <tr className="bg-surface-overlay border-t border-surface-border">
                    <td
                      colSpan={2}
                      className={`px-3 py-1.5 md:sticky md:left-0 z-10 bg-surface-overlay border-r border-surface-border transition-shadow ${
                        isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''
                      }`}
                    >
                      <span className="text-[11px] font-bold uppercase tracking-widest text-verde-400">
                        {group.producto}
                      </span>
                    </td>
                    {groupWeekTotals.map(({ w, cajas }) => (
                      <td
                        key={`gw-${w}`}
                        className="px-2 py-1.5 text-center font-mono tabular-nums font-semibold text-agro-400 border-l border-surface-border/20"
                      >
                        {cajas > 0 ? (
                          cajas.toFixed(0)
                        ) : (
                          <span className="text-carbon-600">—</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Data rows */}
                  {group.rows.map((row, i) => {
                    const sinDatos = Object.keys(row.semanas).length === 0;
                    return (
                      <tr
                        key={`${row.producto}-${row.color}`}
                        className={`table-row-hover border-b border-surface-border/20 transition-opacity ${
                          sinDatos ? 'opacity-40' : ''
                        } ${i % 2 === 0 ? '' : 'bg-surface-overlay/10'}`}
                      >
                        <td className="px-3 py-2 text-carbon-700 whitespace-nowrap text-[11px] md:sticky md:left-0 z-10 bg-white min-w-[130px]" />
                        <td
                          className={`px-3 py-2 font-medium text-carbon-100 whitespace-nowrap md:sticky md:left-[130px] z-10 bg-white min-w-[110px] border-r border-surface-border transition-shadow ${
                            isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''
                          }`}
                        >
                          {row.color}
                        </td>
                        {weekCols.map((w) => {
                          const s = row.semanas[w];
                          const part = s ? s.participacion : null;
                          const esEstimado = s ? !s.esReal : false;
                          return (
                            <td
                              key={w}
                              className={`px-2 py-2 text-center font-mono tabular-nums border-l border-surface-border/20 ${
                                esEstimado ? 'text-dorado-500' : 'text-agro-500'
                              }`}
                            >
                              {part !== null ? (
                                <span
                                  className="inline-flex items-baseline gap-1"
                                  title={esEstimado ? 'Estimado — semana sin dato real aún' : undefined}
                                >
                                  {`${part.toFixed(1)}%`}
                                  {esEstimado && (
                                    <span className="text-[9px] font-semibold uppercase tracking-wide text-dorado-400">
                                      Est.
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-carbon-700">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <FloatingScrollbar scrollRef={scrollRef} isVisible={isVisible} />
    </div>
  );
}
