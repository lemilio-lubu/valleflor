'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'cajas' | 'tallos'>('cajas');
  const [filtroProducto, setFiltroProducto] = useState<string>('');
  const [filtroVariedad, setFiltroVariedad] = useState<string>('');
  const [filtroColor, setFiltroColor] = useState<string>('');

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
  const variedadesUnicas = Array.from(new Set(rows.map((r) => r.variedad))).sort();
  const coloresUnicos = Array.from(new Set(rows.map((r) => r.color))).sort();

  const filteredRows = rows.filter(r => {
    const matchProducto = filtroProducto ? r.producto === filtroProducto : true;
    const matchVariedad = filtroVariedad ? r.variedad === filtroVariedad : true;
    const matchColor = filtroColor ? r.color === filtroColor : true;
    return matchProducto && matchVariedad && matchColor;
  });

  const handleDownloadExcel = () => {
    const dataToExport = filteredRows.map(r => {
      const rowData: any = {
        'Producto': r.producto,
        'Variedad': r.variedad,
        'Color': r.color,
      };

      targetWeeks.forEach(s => {
        const key = `${r.colorId}-${s.anio}-${s.numeroSemana}`;
        const d = r.semanas[String(s.numeroSemana)];
        const estimadas = d?.cajasEstimadas ?? 0;
        const reales = d?.cajas ?? 0;
        const realesTallos = d?.tallos ?? 0;
        const isReal = d?.esReal ?? false;

        const valCajas = isReal ? reales : parseFloat(localEstimaciones[key] ?? estimadas) || 0;
        const valTallos = isReal ? realesTallos : valCajas * 400;

        const val = viewMode === 'cajas' ? valCajas : valTallos;
        rowData[`Sem ${s.numeroSemana}`] = val;
        rowData[`Tipo Sem ${s.numeroSemana}`] = isReal ? 'Real' : 'Estimada';
      });

      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Base Semanal");
    XLSX.writeFile(wb, `base_semanal.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border w-fit">
        <button
          onClick={() => setViewMode('cajas')}
          className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'cajas' ? 'bg-surface-raised text-carbon-50 shadow-sm' : 'text-carbon-400 hover:text-carbon-200'}`}
        >
          Cajas
        </button>
        <button
          onClick={() => setViewMode('tallos')}
          className={`px-4 py-1.5 text-xs font-medium rounded-sm transition-colors ${viewMode === 'tallos' ? 'bg-surface-raised text-carbon-50 shadow-sm' : 'text-carbon-400 hover:text-carbon-200'}`}
        >
          Tallos
        </button>
      </div>

      <div className="flex gap-3 flex-wrap justify-between items-center">
        <div className="flex gap-3 flex-wrap">
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
        <select
          className="input-field text-xs max-w-[200px]"
          value={filtroVariedad}
          onChange={(e) => setFiltroVariedad(e.target.value)}
        >
          <option value="">— Todas las variedades —</option>
          {variedadesUnicas.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
        <select
          className="input-field text-xs max-w-[200px]"
          value={filtroColor}
          onChange={(e) => setFiltroColor(e.target.value)}
        >
          <option value="">— Todos los colores —</option>
          {coloresUnicos.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        </div>
        <button
          onClick={handleDownloadExcel}
          className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2"
          title="Descargar Excel"
        >
          <Download className="w-4 h-4" />
          <span>Excel</span>
        </button>
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
                const estimadasCajas = d?.cajasEstimadas ?? 0;
                const realesCajas = d?.cajas ?? 0;
                const realesTallos = d?.tallos ?? 0;
                const isReal = d?.esReal ?? false;

                const valCajas = isReal ? realesCajas : parseFloat(localEstimaciones[key] ?? estimadasCajas) || 0;
                const valTallos = isReal ? realesTallos : valCajas * 400;
                
                return (
                  <td key={key} className="px-2 py-2 text-center">
                    {viewMode === 'tallos' ? (
                      <div className={`inline-flex flex-col items-center rounded px-2 py-1 w-full max-w-[80px] ${isReal ? 'bg-agro-50 text-agro-600 border border-agro-100' : ''}`}>
                        <span className="font-mono font-medium tabular-nums text-xs">{valTallos.toFixed(2)}</span>
                        <span className={`text-[9px] opacity-70 mt-0.5 ${isReal ? 'text-agro-500' : 'text-carbon-400'}`}>{isReal ? 'Real' : 'Est.'}</span>
                      </div>
                    ) : isReal ? (
                      <div className="inline-flex flex-col items-center rounded px-2 py-1 bg-agro-50 text-agro-600 border border-agro-100 w-full max-w-[80px]">
                        <span className="font-mono font-medium tabular-nums">{realesCajas.toFixed(2)}</span>
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
                          value={localEstimaciones[key] ?? (estimadasCajas === 0 ? '' : estimadasCajas.toFixed(2))}
                          onChange={(e) => handleChange(key, e.target.value)}
                          onBlur={() => handleBlur(row.colorId, s.numeroSemana, s.anio, estimadasCajas)}
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
