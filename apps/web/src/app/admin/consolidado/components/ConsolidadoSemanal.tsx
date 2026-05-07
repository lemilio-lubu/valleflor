'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import * as XLSX from 'xlsx';

interface ConsolidadoSemanalRow {
  producto: string;
  variedad: string;
  color: string;
  finca: string;
  cajasEstimadas: number;
  tallosEstimados: number;
  cajasReales: number;
  tallosReales: number;
}

export interface ConsolidadoSemanalRef {
  download: () => void;
}

interface Props {
  fincaId?: string;
  responsableId?: string;
  semana?: number;
  anio?: number;
}

export const ConsolidadoSemanal = forwardRef<ConsolidadoSemanalRef, Props>(
  function ConsolidadoSemanal({ fincaId, responsableId, semana, anio }, ref) {
    const { data: rows = [], isLoading } = useQuery<ConsolidadoSemanalRow[]>({
      queryKey: ['consolidado-semanal', fincaId, responsableId, semana, anio],
      queryFn: () =>
        api.get('/consolidado/semanal', { params: { fincaId, responsableId, semana, anio } }).then((r) => r.data),
    });

    const totals = rows.reduce(
      (acc, r) => ({
        cajasEstimadas: acc.cajasEstimadas + r.cajasEstimadas,
        tallosEstimados: acc.tallosEstimados + r.tallosEstimados,
        cajasReales: acc.cajasReales + r.cajasReales,
        tallosReales: acc.tallosReales + r.tallosReales,
      }),
      { cajasEstimadas: 0, tallosEstimados: 0, cajasReales: 0, tallosReales: 0 },
    );

    const handleDownload = () => {
      const headers = ['Finca', 'Producto', 'Variedad', 'Color', 'Cajas Est.', 'Tallos Est.', 'Cajas Reales', 'Tallos Reales'];
      const data = rows.map((r) => [r.finca, r.producto, r.variedad, r.color, r.cajasEstimadas, r.tallosEstimados, r.cajasReales, r.tallosReales]);
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Consolidado Semanal');
      XLSX.writeFile(wb, `consolidado_semanal_sem${semana ?? 'all'}_${anio ?? ''}.xlsx`);
    };

    useImperativeHandle(ref, () => ({ download: handleDownload }), [rows]);

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
      return <div className="empty-state">Sin datos semanales para los filtros seleccionados</div>;
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="min-w-max w-full text-xs">
          <thead>
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th">Finca</th>
              <th className="table-th">Producto</th>
              <th className="table-th">Variedad</th>
              <th className="table-th">Color</th>
              <th className="table-th text-center text-dorado-500 min-w-[100px]">Cajas Est.</th>
              <th className="table-th text-center text-dorado-500 min-w-[100px]">Tallos Est.</th>
              <th className="table-th text-center text-agro-500 min-w-[100px]">Cajas Reales</th>
              <th className="table-th text-center text-agro-500 min-w-[100px]">Tallos Reales</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.finca}-${row.producto}-${row.variedad}-${row.color}`}
                className={`table-row-hover border-b border-surface-border/30 ${i % 2 !== 0 ? 'bg-surface-overlay/15' : ''}`}
              >
                <td className="px-phi-3 py-phi-2 text-carbon-300 whitespace-nowrap">{row.finca}</td>
                <td className="px-phi-3 py-phi-2 text-carbon-50 whitespace-nowrap">{row.producto}</td>
                <td className="px-phi-3 py-phi-2 text-carbon-50 whitespace-nowrap">{row.variedad}</td>
                <td className="px-phi-3 py-phi-2 font-medium text-carbon-50 whitespace-nowrap">{row.color}</td>
                <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums text-dorado-500">
                  {row.cajasEstimadas.toFixed(2)}
                </td>
                <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums text-dorado-500">
                  {row.tallosEstimados.toFixed(2)}
                </td>
                <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums">
                  {row.cajasReales > 0
                    ? <span className="text-agro-500">{row.cajasReales.toFixed(2)}</span>
                    : <span className="text-carbon-500">—</span>}
                </td>
                <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums">
                  {row.tallosReales > 0
                    ? <span className="text-agro-500">{row.tallosReales.toFixed(2)}</span>
                    : <span className="text-carbon-500">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-surface-border bg-surface-overlay">
              <td colSpan={4} className="px-phi-3 py-phi-2 text-xs font-semibold text-carbon-200 uppercase tracking-wide">
                Total general
              </td>
              <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums font-bold text-dorado-500">
                {totals.cajasEstimadas.toFixed(2)}
              </td>
              <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums font-bold text-dorado-500">
                {totals.tallosEstimados.toFixed(2)}
              </td>
              <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums font-bold text-agro-500">
                {totals.cajasReales.toFixed(2)}
              </td>
              <td className="px-phi-2 py-phi-2 text-center font-mono tabular-nums font-bold text-agro-500">
                {totals.tallosReales.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }
);
