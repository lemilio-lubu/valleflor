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

function DivisorModal({ row, onClose }: { row: PlantillaRow; onClose: () => void }) {
  const qc = useQueryClient();
  const [val, setVal] = useState(String(row.divisorTallos));

  const update = useMutation({
    mutationFn: (divisorTallos: number) =>
      api.patch(`/registros/${row.registroId}/divisor`, { divisorTallos }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plantilla', row.registroId.slice(0, 8)] });
      toast.success('Divisor actualizado');
      onClose();
    },
    onError: () => toast.error('Error al actualizar'),
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-raised border border-surface-border rounded-xl w-80 p-6 shadow-2xl animate-slide-up">
        <h3 className="font-serif text-lg mb-1">Editar divisor</h3>
        <p className="text-carbon-400 text-xs font-mono mb-4">{row.color} · {row.dia}</p>
        <input
          type="number"
          min="1"
          className="input-field mb-4"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Cancelar</button>
          <button
            onClick={() => update.mutate(Number(val))}
            disabled={update.isPending}
            className="btn-primary flex-1 justify-center text-sm"
          >{update.isPending ? '...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

export function PlantillaDiaria({ semanaId }: Props) {
  const qc = useQueryClient();
  const [localCajas, setLocalCajas] = useState<Record<string, string>>({});
  const [divisorModal, setDivisorModal] = useState<PlantillaRow | null>(null);

  const { data: rows = [], isLoading } = useQuery<PlantillaRow[]>({
    queryKey: ['plantilla', semanaId],
    queryFn: () => api.get(`/semanas/${semanaId}/plantilla`).then((r) => r.data),
    enabled: !!semanaId,
  });

  const updateCajas = useMutation({
    mutationFn: ({ id, cajas, divisorTallos }: { id: string; cajas: number; divisorTallos?: number }) =>
      api.patch(`/registros/${id}`, { cajas, divisorTallos }),
    onSuccess: (res, vars) => {
      qc.invalidateQueries({ queryKey: ['plantilla', semanaId] });
      if (res.data?.warning) {
        toast(`⚠️ ${res.data.warning}`, { style: { background: '#78350f', color: '#fef3c7', border: '1px solid #92400e' } });
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

  // Calcular tallos en tiempo real en el frontend
  const getTallos = (row: PlantillaRow) => {
    const cajasStr = localCajas[row.registroId];
    const cajas = cajasStr !== undefined ? (parseFloat(cajasStr) || 0) : row.cajas;
    return Math.round((cajas / row.divisorTallos) * 100) / 100;
  };

  const [filtroDia, setFiltroDia] = useState<string>('');
  const [filtroProducto, setFiltroProducto] = useState<string>('');

  if (isLoading) return (
    <div className="space-y-2 mt-4">
      {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-surface-overlay rounded animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />)}
    </div>
  );

  if (rows.length === 0) return (
    <div className="text-center py-12 text-carbon-400 font-mono text-sm">Sin registros para esta semana</div>
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
              {['DIA', 'FECHA', 'PRODUCTO', 'VARIEDAD', 'COLOR', 'CAJAS', 'TALLOS', '÷'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-mono uppercase tracking-widest text-carbon-400 whitespace-nowrap">{h}</th>
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
                    <td className="px-3 py-2.5 font-mono font-medium text-verde-500 whitespace-nowrap" rowSpan={byDia[dia].length}>
                      {DIA_SHORT[dia]}
                    </td>
                  ) : null}
                  <td className="px-3 py-2.5 text-carbon-400 font-mono whitespace-nowrap">{row.fecha}</td>
                  <td className="px-3 py-2.5 text-carbon-300 whitespace-nowrap">{row.producto}</td>
                  <td className="px-3 py-2.5 text-carbon-300 whitespace-nowrap">{row.variedad}</td>
                  <td className="px-3 py-2.5 text-carbon-200 font-medium whitespace-nowrap">{row.color}</td>
                  <td className="px-3 py-2">
                    <input
                      id={`cajas-${row.registroId}`}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="w-24 bg-surface-overlay border border-surface-border rounded px-2 py-1 text-carbon-50 font-mono text-xs focus:border-verde-600 focus:ring-1 focus:ring-verde-600 outline-none transition-colors text-right placeholder:text-carbon-500/50"
                      value={localCajas[row.registroId] ?? (row.cajas === 0 ? '' : Number(row.cajas).toFixed(2))}
                      onChange={(e) => handleChange(row.registroId, e.target.value)}
                      onBlur={() => handleBlur(row)}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-verde-400 tabular-nums">
                    {getTallos(row).toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      id={`divisor-${row.registroId}`}
                      onClick={() => setDivisorModal(row)}
                      title={`Divisor: ${row.divisorTallos}`}
                      className="text-carbon-500 hover:text-dorado-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {divisorModal && (
        <DivisorModal
          row={divisorModal}
          onClose={() => { setDivisorModal(null); qc.invalidateQueries({ queryKey: ['plantilla', semanaId] }); }}
        />
      )}
    </>
  );
}
