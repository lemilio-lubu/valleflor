'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import * as XLSX from 'xlsx';

type DiaKey = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';

const DIAS: DiaKey[] = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

const DIA_LABELS: Record<DiaKey, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

interface DiaData { cajas: number; tallos: number; }

interface ConsolidadoDiarioRow {
  producto: string;
  variedad: string;
  color: string;
  dias: Partial<Record<DiaKey, DiaData>>;
  totalCajas: number;
  totalTallos: number;
}

export interface ConsolidadoDiarioRef {
  download: () => void;
}

interface Props {
  semana?: number;
  anio?: number;
  viewMode: 'cajas' | 'tallos';
}

export function ConsolidadoDiario({ semana, anio }: Props) {
  const [viewMode, setViewMode] = useState<'cajas' | 'tallos'>('cajas');

  const { data: rows = [], isLoading } = useQuery<ConsolidadoDiarioRow[]>({
    queryKey: ['consolidado-diario', semana, anio],
    queryFn: () =>
      api
        .get('/consolidado/diario', { params: { semana, anio } })
        .then((r) => r.data),
  });

  const grandTotal = rows.reduce(
    (acc, r) => ({ cajas: acc.cajas + r.totalCajas, tallos: acc.tallos + r.totalTallos }),
    { cajas: 0, tallos: 0 },
  );

  const handleDownloadExcel = () => {
    const isCajas = viewMode === 'cajas';
    const headers = [
      'Producto',
      'Variedad',
      'Color',
      ...DIAS.map((d) => (isCajas ? `Cajas ${DIA_LABELS[d]}` : `Tallos ${DIA_LABELS[d]}`)),
      isCajas ? 'Total Cajas' : 'Total Tallos',
    ];
    const data = rows.map((r) => [
      r.producto,
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
          <div key={i} className="h-9 bg-surface-overlay rounded animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Toggle cajas / tallos */}
        <div className="flex gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border w-fit">
          <button
            onClick={() => setViewMode('cajas')}
            className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'cajas'
                ? 'bg-surface-raised text-carbon-50 shadow-sm'
                : 'text-carbon-400 hover:text-carbon-200'
              }`}
          >
            Cajas
          </button>
          <button
            onClick={() => setViewMode('tallos')}
            className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'tallos'
                ? 'bg-surface-raised text-carbon-50 shadow-sm'
                : 'text-carbon-400 hover:text-carbon-200'
              }`}
          >
            Tallos
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

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="min-w-max w-full text-xs">
          <thead>
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th">Producto</th>
              <th className="table-th">Variedad</th>
              <th className="table-th">Color</th>
              {DIAS.map((d) => (
                <th key={d} className="table-th text-center min-w-[64px]">{DIA_LABELS[d]}</th>
              ))}
              <th className="table-th text-center min-w-[80px] text-verde-600">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const total = viewMode === 'cajas' ? row.totalCajas : row.totalTallos;
              return (
                <tr
                  key={`${row.producto}-${row.variedad}-${row.color}`}
                  className={`table-row-hover border-b border-surface-border/30 ${i % 2 === 0 ? '' : 'bg-surface-overlay/15'
                    }`}
                >
                  <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap">{row.producto}</td>
                  <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap">{row.variedad}</td>
                  <td className="px-3 py-2.5 font-medium text-carbon-50 whitespace-nowrap">
                    {row.color}
                  </td>
                  {DIAS.map((d) => {
                    const v = row.dias[d];
                    const val = v ? (viewMode === 'cajas' ? v.cajas : v.tallos) : null;
                    return (
                      <td key={d} className="px-phi-2 py-phi-2 text-center font-mono tabular-nums">
                        {val !== null
                          ? <span className="text-carbon-50">{val.toFixed(2)}</span>
                          : <span className="text-carbon-500">—</span>}
                      </td>
                    );
                  })}
                  <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums font-semibold text-verde-600">
                    {total.toFixed(2)}
                  </td>
                </tr>
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
              {DIAS.map((d) => {
                const total = rows.reduce((s, r) => {
                  const v = r.dias[d];
                  return s + (v ? (viewMode === 'cajas' ? v.cajas : v.tallos) : 0);
                }, 0);
                return (
                  <td key={d} className="px-phi-2 py-phi-2 text-center font-mono tabular-nums font-semibold text-carbon-50">
                    {total > 0 ? total.toFixed(2) : <span className="text-carbon-500">—</span>}
                  </td>
                );
              })}
              <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums font-bold text-verde-600">
                {(viewMode === 'cajas' ? grandTotal.cajas : grandTotal.tallos).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      );
  }
      );
