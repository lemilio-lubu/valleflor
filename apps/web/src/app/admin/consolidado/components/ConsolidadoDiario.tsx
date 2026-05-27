'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTableScroll } from '@/lib/useTableScroll';
import { FloatingScrollbar } from '@/lib/FloatingScrollbar';

type DiaKey = 'DOMINGO' | 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO';

const DIAS: DiaKey[] = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

const DIA_LABELS: Record<DiaKey, string> = {
  DOMINGO: 'Dom',
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
};

const DIA_OFFSET: Record<DiaKey, number> = {
  DOMINGO: 0,
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
};

function getWeekDates(semana: number, anio: number): Record<DiaKey, Date> {
  const jan1 = new Date(anio, 0, 1);
  const week1Start = new Date(jan1);
  week1Start.setDate(jan1.getDate() - jan1.getDay()); // retroceder al domingo de la semana 1
  const result = {} as Record<DiaKey, Date>;
  for (const dia of DIAS) {
    const d = new Date(week1Start);
    d.setDate(week1Start.getDate() + (semana - 1) * 7 + DIA_OFFSET[dia]);
    result[dia] = d;
  }
  return result;
}

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

interface DiaData {
  cajas: number;
  tallos: number;
}

interface ConsolidadoDiarioRow {
  finca: string;
  producto: string;
  variedad: string;
  color: string;
  codigo: string | null;
  nombreOriginal: string | null;
  dias: Partial<Record<DiaKey, DiaData>>;
  totalCajas: number;
  totalTallos: number;
}

interface ProductGroup {
  producto: string;
  rows: ConsolidadoDiarioRow[];
}

interface Props {
  semana?: number;
  anio?: number;
  fincaId?: string;
}

function groupByProducto(rows: ConsolidadoDiarioRow[]): ProductGroup[] {
  const map = new Map<string, ConsolidadoDiarioRow[]>();
  for (const row of rows) {
    if (!map.has(row.producto)) map.set(row.producto, []);
    map.get(row.producto)!.push(row);
  }
  return Array.from(map.entries()).map(([producto, rows]) => ({ producto, rows }));
}

export function ConsolidadoDiario({ semana, anio, fincaId }: Props) {
  const [viewMode, setViewMode] = useState<'cajas' | 'tallos'>('cajas');
  const weekDates = semana != null && anio != null ? getWeekDates(semana, anio) : null;
  const { scrollRef, isScrolled, canScrollRight, isVisible, scrollLeft, scrollRight } = useTableScroll(220);

  const { data: rows = [], isLoading } = useQuery<ConsolidadoDiarioRow[]>({
    queryKey: ['consolidado-diario', semana, anio, fincaId],
    queryFn: () =>
      api
        .get('/consolidado/diario', { params: { semana, anio, fincaId } })
        .then((r) => r.data),
  });

  const groups = groupByProducto(rows);

  const grandTotal = rows.reduce(
    (acc, r) => ({
      cajas: acc.cajas + r.totalCajas,
      tallos: acc.tallos + r.totalTallos,
    }),
    { cajas: 0, tallos: 0 },
  );

  const handleDownloadExcel = () => {
    const isCajas = viewMode === 'cajas';
    const headers = [
      'Finca',
      'Código',
      'Producto',
      'Nombre Original',
      'Variedad',
      'Color',
      ...DIAS.map((d) => {
        const label = DIA_LABELS[d];
        const date = weekDates ? ` ${formatDate(weekDates[d])}` : '';
        return isCajas ? `Cajas ${label}${date}` : `Tallos ${label}${date}`;
      }),
      isCajas ? 'Total Cajas' : 'Total Tallos',
    ];
    const data = rows.map((r) => [
      r.finca,
      r.codigo || '',
      r.producto,
      r.nombreOriginal || '',
      r.variedad,
      r.color,
      ...DIAS.map((d) => {
        const v = r.dias[d];
        return v ? (isCajas ? v.cajas : v.tallos) : 0;
      }),
      isCajas ? r.totalCajas : r.totalTallos,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Consolidado Diario');
    XLSX.writeFile(wb, `consolidado_diario_sem${semana ?? 'all'}_${anio ?? ''}.xlsx`);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(6)].map((_, i) => (
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
        Sin registros diarios para la semana seleccionada
      </div>
    );
  }

  const isCajas = viewMode === 'cajas';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Toggle cajas / tallos */}
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

      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border border-surface-border scrollbar-always"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="min-w-max w-full text-xs">
          <thead>
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th md:sticky md:left-0 z-20 bg-surface-overlay min-w-[120px]">Finca</th>
              <th className="table-th md:sticky md:left-[120px] z-20 bg-surface-overlay min-w-[130px]">Producto</th>
              <th className="table-th md:sticky md:left-[250px] z-20 bg-surface-overlay min-w-[120px]">Variedad</th>
              <th className={`table-th md:sticky md:left-[370px] z-20 bg-surface-overlay min-w-[110px] border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}>Color</th>
              <th className="table-th min-w-[90px] border-r border-surface-border/40 text-carbon-200">Código</th>
              <th className="table-th min-w-[150px] border-r border-surface-border/40 text-carbon-200">Nombre Original</th>
              {DIAS.map((d) => (
                <th key={d} className="table-th text-center min-w-[72px]">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{DIA_LABELS[d]}</span>
                    {weekDates && (
                      <span className="text-[10px] font-normal text-carbon-400 tabular-nums">
                        {formatDate(weekDates[d])}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="table-th text-center min-w-[80px] text-verde-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => {
              const groupTotal = group.rows.reduce(
                (s, r) => s + (isCajas ? r.totalCajas : r.totalTallos),
                0,
              );
              const hasData = group.rows.some((r) => Object.keys(r.dias).length > 0);

              return (
                <>
                  {/* Encabezado de grupo — Producto */}
                  <tr
                    key={`group-${group.producto}`}
                    className="bg-surface-overlay border-t border-surface-border"
                  >
                    <td
                      colSpan={6}
                      className="px-3 py-1.5 md:sticky md:left-0 z-10 bg-surface-overlay"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-widest text-verde-400">
                        {group.producto}
                      </span>
                    </td>
                    <td
                      colSpan={DIAS.length + 1}
                      className="px-3 py-1.5 text-right"
                    >
                      <span className={`text-[10px] font-mono tabular-nums font-semibold ${hasData ? 'text-verde-300' : 'text-carbon-600'}`}>
                        {isCajas ? 'Cajas' : 'Tallos'}: {groupTotal.toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  {/* Filas de variedad/color */}
                  {group.rows.map((row, i) => {
                    const total = isCajas ? row.totalCajas : row.totalTallos;
                    const sinDatos = Object.keys(row.dias).length === 0;
                    return (
                      <tr
                        key={`${row.finca}-${row.producto}-${row.variedad}-${row.color}`}
                        className={`table-row-hover border-b border-surface-border/20 transition-opacity ${
                          sinDatos ? 'opacity-40' : ''
                        } ${i % 2 === 0 ? '' : 'bg-surface-overlay/10'}`}
                      >
                        <td className="px-3 py-2 text-carbon-300 whitespace-nowrap text-[11px] md:sticky md:left-0 z-10 bg-white min-w-[120px]">{row.finca}</td>
                        <td className="px-3 py-2 text-carbon-400 whitespace-nowrap text-[11px] md:sticky md:left-[120px] z-10 bg-white min-w-[130px]">
                          {/* Producto vacío porque ya aparece en el encabezado del grupo */}
                        </td>
                        <td className="px-3 py-2 text-carbon-200 whitespace-nowrap md:sticky md:left-[250px] z-10 bg-white min-w-[120px]">{row.variedad}</td>
                        <td className={`px-3 py-2 font-medium text-carbon-100 whitespace-nowrap md:sticky md:left-[370px] z-10 bg-white min-w-[110px] border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}>{row.color}</td>
                        <td className="px-3 py-2 text-carbon-300 font-mono text-[11px] whitespace-nowrap border-r border-surface-border/20">{row.codigo || <span className="text-carbon-600">—</span>}</td>
                        <td className="px-3 py-2 text-carbon-300 text-[11px] whitespace-nowrap italic border-r border-surface-border/20">{row.nombreOriginal || <span className="text-carbon-600">—</span>}</td>
                        {DIAS.map((d) => {
                          const v = row.dias[d];
                          const val = v ? (isCajas ? v.cajas : v.tallos) : null;
                          return (
                            <td key={d} className="px-2 py-2 text-center font-mono tabular-nums">
                              {val !== null && val > 0 ? (
                                <span className="text-carbon-100">{val.toFixed(2)}</span>
                              ) : (
                                <span className="text-carbon-700">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center font-mono tabular-nums font-semibold text-verde-400">
                          {total > 0 ? total.toFixed(2) : <span className="text-carbon-700">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-border bg-surface-overlay">
              <td
                colSpan={6}
                className={`px-3 py-2.5 text-xs font-semibold text-carbon-200 uppercase tracking-wide md:sticky md:left-0 z-10 bg-surface-overlay border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}
              >
                Total general
              </td>
              {DIAS.map((d) => {
                const total = rows.reduce((s, r) => {
                  const v = r.dias[d];
                  return s + (v ? (isCajas ? v.cajas : v.tallos) : 0);
                }, 0);
                return (
                  <td
                    key={d}
                    className="px-2 py-2.5 text-center font-mono tabular-nums font-semibold text-carbon-100"
                  >
                    {total > 0 ? total.toFixed(2) : <span className="text-carbon-600">—</span>}
                  </td>
                );
              })}
              <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-verde-400">
                {(isCajas ? grandTotal.cajas : grandTotal.tallos).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <FloatingScrollbar scrollRef={scrollRef} isVisible={isVisible} />
    </div>
  );
}
