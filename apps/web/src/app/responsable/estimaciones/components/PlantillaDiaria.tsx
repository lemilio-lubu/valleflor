'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface PlantillaRow {
  registroId: string;
  dia: string;
  fecha: string;
  producto: string;
  variedad: string;
  color: string;
  colorId: string;
  cajas: number;
  divisorTallos: number;
  tallos: number;
}

const DIA_ORDER = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
const DIA_SHORT: Record<string, string> = {
  DOMINGO: 'DOM', LUNES: 'LUN', MARTES: 'MAR', MIERCOLES: 'MIÉ',
  JUEVES: 'JUE', VIERNES: 'VIE', SABADO: 'SÁB',
};

interface Props { semanaId: string; }


export function PlantillaDiaria({ semanaId }: Props) {
  const qc = useQueryClient();
  const [localCajas, setLocalCajas] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading } = useQuery<PlantillaRow[]>({
    queryKey: ['plantilla', semanaId],
    queryFn: () => api.get(`/semanas/${semanaId}/plantilla`).then((r) => r.data),
    enabled: !!semanaId,
  });

  const updateCajas = useMutation({
    mutationFn: ({ id, cajas, divisorTallos }: { id: string; cajas: number; divisorTallos?: number }) =>
      api.patch(`/registros/${id}`, { cajas, divisorTallos }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['plantilla', semanaId] });
      if (res.data?.warning) {
        toast(`${res.data.warning}`, { style: { background: 'var(--warning-bg)', color: 'var(--text-primary)', border: '1px solid var(--warning)' } });
      } else {
        toast.success('Cajas guardadas');
      }
    },
    onError: () => toast.error('Error al guardar cajas'),
  });

  const handleChange = useCallback((registroId: string, value: string) => {
    if (value === '' || /^\d+(\.\d{0,2})?$/.test(value)) {
      setLocalCajas((p) => ({ ...p, [registroId]: value }));
    }
  }, []);

  const handleBlur = useCallback((row: PlantillaRow) => {
    const raw = localCajas[row.registroId];
    if (raw === undefined) return;
    
    let cajas = parseFloat(raw);
    if (isNaN(cajas) || cajas === 0) {
      cajas = 0;
      setLocalCajas((p) => ({ ...p, [row.registroId]: '' })); // Usar placeholder
    } else {
      setLocalCajas((p) => ({ ...p, [row.registroId]: cajas.toFixed(2) }));
    }

    if (cajas !== row.cajas) {
      updateCajas.mutate({ id: row.registroId, cajas });
    }
  }, [localCajas, updateCajas]);


  const [filtroDia, setFiltroDia] = useState<string>('');
  const [filtroProducto, setFiltroProducto] = useState<string>('');

  if (isLoading) return (
    <div className="space-y-2 mt-4">
      {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-surface-overlay rounded animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />)}
    </div>
  );

  if (rows.length === 0) return (
    <div className="empty-state">Sin registros para esta semana</div>
  );

  // Extraer valores únicos para filtros
  const diasUnicos = Array.from(new Set(rows.map((r) => r.dia)));
  const productosUnicos = Array.from(new Set(rows.map((r) => r.producto))).sort();

  // Aplicar filtros
  const filteredRows = rows.filter((r) => {
    const matchDia = filtroDia ? r.dia === filtroDia : true;
    const matchProducto = filtroProducto ? r.producto === filtroProducto : true;
    return matchDia && matchProducto;
  });

  // Agrupar por día
  const byDia = DIA_ORDER.reduce<Record<string, PlantillaRow[]>>((acc, dia) => {
    const rowsForDia = filteredRows.filter((r) => r.dia === dia);
    if (rowsForDia.length > 0) acc[dia] = rowsForDia;
    return acc;
  }, {});

  return (
    <>
      <div className="flex gap-3 mb-4">
        <select
          className="input-field text-xs max-w-[150px]"
          value={filtroDia}
          onChange={(e) => setFiltroDia(e.target.value)}
        >
          <option value="">— Todos los días —</option>
          {DIA_ORDER.filter(d => diasUnicos.includes(d)).map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          className="input-field text-xs max-w-[200px]"
          value={filtroProducto}
          onChange={(e) => setFiltroProducto(e.target.value)}
        >
          <option value="">— Todos los productos —</option>
          {productosUnicos.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-overlay border-b border-surface-border">
              {['DIA', 'FECHA', 'PRODUCTO', 'VARIEDAD', 'COLOR', 'CAJAS', 'TALLOS'].map((h) => (
                <th key={h} className="table-th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DIA_ORDER.map((dia) =>
              byDia[dia]?.map((row, idx) => (
                <tr
                  key={row.registroId}
                  className={`table-row-hover border-b border-surface-border/30 ${idx === 0 ? 'border-t border-surface-border/60' : ''}`}
                >
                  {idx === 0 ? (
                    <td className="px-3 py-2.5 font-mono font-semibold text-verde-600 whitespace-nowrap" rowSpan={byDia[dia].length}>
                      {DIA_SHORT[dia]}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 text-carbon-400 font-mono whitespace-nowrap">{row.fecha}</td>
                  <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap">{row.producto}</td>
                  <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap">{row.variedad}</td>
                  <td className="px-3 py-2.5 text-carbon-50 font-semibold whitespace-nowrap">{row.color}</td>
                  <td className="px-3 py-2">
                    <input
                      id={`cajas-${row.registroId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-24 bg-surface-overlay border border-surface-border rounded px-2 py-1 text-carbon-50 font-mono text-xs focus:border-verde-600 focus:ring-1 focus:ring-verde-600 outline-none transition-colors text-right placeholder:text-carbon-400"
                      value={localCajas[row.registroId] ?? (row.cajas === 0 ? '' : Number(row.cajas).toFixed(2))}
                      onChange={(e) => handleChange(row.registroId, e.target.value)}
                      onBlur={() => handleBlur(row)}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-agro-500 tabular-nums">
                    {Number(row.tallos).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </>
  );
}
