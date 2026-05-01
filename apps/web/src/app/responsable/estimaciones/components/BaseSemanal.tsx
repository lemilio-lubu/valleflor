'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface SemanaData {
  cajas: number;
  tallos: number;
  cajasEstimadas: number;
  tallosEstimados: number;
  esReal: boolean;
}
interface MatrizRow {
  finca: string;
  producto: string;
  variedad: string;
  color: string;
  colorId: string;
  semanas: Record<string, SemanaData>;
}
interface BaseSemanalResponse {
  semanas: Array<{ anio: number; numeroSemana: number }>;
  rows: MatrizRow[];
}

interface Props { fincaId: string; semanas?: number; }

export function BaseSemanal({ fincaId, semanas = 10 }: Props) {
  const qc = useQueryClient();
  const [localEstimaciones, setLocalEstimaciones] = useState<Record<string, string>>({});
  const [filtroProducto, setFiltroProducto] = useState<string>('');

  const { data, isLoading } = useQuery<BaseSemanalResponse>({
    queryKey: ['base-semanal', fincaId, semanas],
    queryFn: () =>
      api.get('/base-semanal', { params: { fincaId, semanas } }).then((r) => r.data),
    enabled: !!fincaId,
  });

  const updateEstimacion = useMutation({
    mutationFn: ({ colorId, numeroSemana, anio, cajasEstimadas }: any) =>
      api.patch('/base-semanal/estimar', {}, {
        params: { colorId, numeroSemana, anio, cajasEstimadas, divisor: 400 }
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['base-semanal', fincaId, semanas] });
      toast.success('Estimación guardada');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar estimación'),
  });

  const handleChange = (key: string, value: string) => {
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setLocalEstimaciones((p) => ({ ...p, [key]: value }));
    }
  };

  const handleBlur = (
    colorId: string, 
    numeroSemana: number, 
    anio: number, 
    originalValue: number
  ) => {
    const key = `${colorId}-${anio}-${numeroSemana}`;
    const raw = localEstimaciones[key];
    if (raw === undefined) return;
    
    let cajas = parseFloat(raw);
    if (isNaN(cajas) || cajas === 0) {
      cajas = 0;
      setLocalEstimaciones((p) => ({ ...p, [key]: '' }));
    } else {
      setLocalEstimaciones((p) => ({ ...p, [key]: cajas.toFixed(2) }));
    }

    if (cajas !== originalValue) {
      updateEstimacion.mutate({ colorId, numeroSemana, anio, cajasEstimadas: cajas });
    }
  };

  if (isLoading) return (
    <div className="space-y-2 mt-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-9 bg-surface-overlay rounded animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
      ))}
    </div>
  );

  if (!data || data.rows.length === 0) return (
    <div className="empty-state">Sin datos de base semanal para esta finca</div>
  );

  const { semanas: targetWeeks, rows } = data;
  const productosUnicos = Array.from(new Set(rows.map((r) => r.producto))).sort();
  const filteredRows = rows.filter(r => filtroProducto ? r.producto === filtroProducto : true);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <select
          className="input-field text-xs max-w-[200px]"
          value={filtroProducto}
          onChange={(e) => setFiltroProducto(e.target.value)}
        >
          <option value="">— Todos los productos —</option>
          {productosUnicos.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="min-w-max w-full text-xs">
        <thead>
          <tr className="bg-surface-overlay border-b border-surface-border">
            <th className="table-th">Producto</th>
            <th className="table-th">Variedad</th>
            <th className="table-th">Color</th>
            {targetWeeks.map((s) => (
              <th key={`${s.anio}-${s.numeroSemana}`} className="table-th text-center min-w-[90px]">
                Sem {s.numeroSemana}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, i) => (
            <tr
              key={row.colorId}
              className={`table-row-hover border-b border-surface-border/30 ${i % 2 === 0 ? '' : 'bg-surface-overlay/15'}`}
            >
              <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap">{row.producto}</td>
              <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap">{row.variedad}</td>
              <td className="px-3 py-2.5 font-medium text-carbon-50 whitespace-nowrap">{row.color}</td>
              {targetWeeks.map((s) => {
                const d = row.semanas[String(s.numeroSemana)];
                const key = `${row.colorId}-${s.anio}-${s.numeroSemana}`;
                const isReal = d?.esReal ?? false;
                const estimadas = d?.cajasEstimadas ?? 0;
                const reales = d?.cajas ?? 0;
                
                return (
                  <td key={key} className="px-2 py-2 text-center">
                    {isReal ? (
                      <div className="inline-flex flex-col items-center rounded px-2 py-1 bg-agro-50 text-agro-600 border border-agro-100 w-full max-w-[80px]">
                        <span className="font-mono font-medium tabular-nums">{reales.toFixed(2)}</span>
                        <span className="text-[9px] opacity-70 text-agro-500 mt-0.5">Real</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          className="w-full max-w-[80px] bg-surface-overlay border border-surface-border rounded px-2 py-1 text-dorado-500 font-mono text-xs focus:border-dorado-500 focus:ring-1 focus:ring-dorado-500 outline-none transition-colors text-right placeholder:text-carbon-400"
                          value={localEstimaciones[key] ?? (estimadas === 0 ? '' : estimadas.toFixed(2))}
                          onChange={(e) => handleChange(key, e.target.value)}
                          onBlur={() => handleBlur(row.colorId, s.numeroSemana, s.anio, estimadas)}
                        />
                        <span className="text-[9px] opacity-70 text-carbon-400 mt-1">Est.</span>
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
