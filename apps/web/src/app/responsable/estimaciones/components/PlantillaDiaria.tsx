'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx-js-style';
import { Download } from 'lucide-react';
import { FiltrosTabla } from './FiltrosTabla';

interface PlantillaRow {
  semanaNumero: number;
  anio: number;
  registroId: string;
  dia: string;
  fecha: string;
  finca: string;
  responsable: string;
  producto: string;
  variedad: string;
  color: string;
  colorId: string;
  cajas: number;
  divisorTallos: number;
  tallos: number;
}

const DIA_ORDER = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

interface PivotRow {
  producto: string;
  variedad: string;
  color: string;
  colorId: string;
  registros: Record<string, PlantillaRow>;
}

interface Props { semanaId: string; }

export function PlantillaDiaria({ semanaId }: Props) {
  const qc = useQueryClient();
  const [localCajas, setLocalCajas] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'cajas' | 'tallos'>('cajas');

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
      qc.invalidateQueries({ queryKey: ['base-semanal'] });
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
      setLocalCajas((p) => ({ ...p, [row.registroId]: '' }));
    } else {
      setLocalCajas((p) => ({ ...p, [row.registroId]: cajas.toFixed(2) }));
    }

    if (cajas !== row.cajas) {
      updateCajas.mutate({ id: row.registroId, cajas });
    }
  }, [localCajas, updateCajas]);



  const [filtroProducto, setFiltroProducto] = useState<string>('');
  const [filtroVariedad, setFiltroVariedad] = useState<string>('');
  const [filtroColor, setFiltroColor] = useState<string>('');

  if (isLoading) return (
    <div className="space-y-2 mt-4">
      {[...Array(8)].map((_, i) => <div key={i} className="h-10 bg-surface-overlay rounded animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />)}
    </div>
  );

  if (rows.length === 0) return (
    <div className="empty-state">Sin registros para esta semana</div>
  );

  // Aplicar filtros
  const filteredRows = rows.filter((r) => {
    const matchProducto = filtroProducto ? r.producto === filtroProducto : true;
    const matchVariedad = filtroVariedad ? r.variedad === filtroVariedad : true;
    const matchColor = filtroColor ? r.color === filtroColor : true;
    return matchProducto && matchVariedad && matchColor;
  });

  // Agrupar por colorId para la vista pivote
  const fechasPorDia: Record<string, string> = {};
  rows.forEach(r => {
    fechasPorDia[r.dia] = r.fecha;
  });

  const groupedRows = Object.values(filteredRows.reduce<Record<string, PivotRow>>((acc, r) => {
    if (!acc[r.colorId]) {
      acc[r.colorId] = {
        producto: r.producto,
        variedad: r.variedad,
        color: r.color,
        colorId: r.colorId,
        registros: {}
      };
    }
    acc[r.colorId].registros[r.dia] = r;
    return acc;
  }, {})).sort((a, b) => {
    if (a.producto !== b.producto) return a.producto.localeCompare(b.producto);
    if (a.variedad !== b.variedad) return a.variedad.localeCompare(b.variedad);
    return a.color.localeCompare(b.color);
  });

  const handleDownloadExcel = () => {
    const firstRow = rows[0];
    const finca = firstRow?.finca ?? '';
    const responsable = firstRow?.responsable ?? '';
    const semanaNumero = firstRow?.semanaNumero ?? '';
    const anio = firstRow?.anio ?? '';
    const ahora = new Date();
    const fechaEmision = ahora.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaEmision = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tipo = viewMode === 'cajas' ? 'Cajas' : 'Tallos';

    const diaHeaders = DIA_ORDER.map(d => fechasPorDia[d] ? `${d} (${fechasPorDia[d]})` : d);
    const tableHeader = ['Producto', 'Variedad', 'Color', ...diaHeaders, 'Total general'];

    const dataRows = groupedRows.map((group) => {
      let total = 0;
      const dias = DIA_ORDER.map((dia) => {
        const r = group.registros[dia];
        if (!r) return 0;
        const valCajas = parseFloat(localCajas[r.registroId] ?? r.cajas) || 0;
        const val = viewMode === 'cajas' ? valCajas : valCajas * (r.divisorTallos || 400);
        total += val;
        return val;
      });
      return [group.producto, group.variedad, group.color, ...dias, total];
    });

    const totalCols = tableHeader.length;

    const aoa = [
      ['PLANTILLA DIARIA'],
      [`Finca: ${finca}`],
      [`Responsable: ${responsable}`],
      [`Semana: ${semanaNumero} / ${anio}`],
      [`Vista: ${tipo}     |     Fecha de emisión: ${fechaEmision} ${horaEmision}`],
      [],
      tableHeader,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    Object.keys(ws).forEach(addr => {
      if (addr.startsWith('!')) return;
      const cell = ws[addr];
      if (cell.t === 'n') cell.z = '0.00';
    });

    // Mergear filas de cabecera a lo ancho de toda la tabla
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } },
    ];

    // Anchos de columna
    ws['!cols'] = [
      { wch: 18 }, // Producto
      { wch: 18 }, // Variedad
      { wch: 14 }, // Color
      ...Array(7).fill({ wch: 16 }), // días
      { wch: 14 }, // Total general
    ];

    // Altura de la fila del título
    ws['!rows'] = [{ hpt: 22 }, { hpt: 15 }, { hpt: 15 }, { hpt: 15 }, { hpt: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Diaria');
    XLSX.writeFile(wb, `plantilla_diaria_sem${semanaNumero}_${anio}_${tipo.toLowerCase()}.xlsx`);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-carbon-400">Mostrar en:</span>
          <div className="flex gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border">
            {(['cajas', 'tallos'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1 text-xs font-medium rounded-sm transition-colors ${
                  viewMode === mode ? 'bg-surface-raised text-carbon-50 shadow-sm' : 'text-carbon-400 hover:text-carbon-200'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
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

      <div className="mb-4">
        <FiltrosTabla
          items={rows}
          filtroProducto={filtroProducto}
          filtroVariedad={filtroVariedad}
          filtroColor={filtroColor}
          onProducto={setFiltroProducto}
          onVariedad={setFiltroVariedad}
          onColor={setFiltroColor}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th text-left sticky left-0 z-20 bg-surface-overlay min-w-[110px]">Producto</th>
              <th className="table-th text-left sticky left-[110px] z-20 bg-surface-overlay min-w-[110px]">Variedad</th>
              <th className="table-th text-left sticky left-[220px] z-20 bg-surface-overlay min-w-[100px] border-r border-surface-border shadow-[2px_0_6px_rgba(0,0,0,0.06)]">Color</th>
              {DIA_ORDER.map(d => (
                <th key={d} className="table-th text-center">
                  <div>{d}</div>
                  <div className="text-[10px] text-carbon-400 font-normal mt-0.5">{fechasPorDia[d] || ''}</div>
                </th>
              ))}
              <th className="table-th text-right">Total general</th>
            </tr>
          </thead>
          <tbody>
            {groupedRows.map((group) => {
              let totalFila = 0;
              return (
                <tr key={group.colorId} className={`table-row-hover border-b border-surface-border/30`}>
                  <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap sticky left-0 z-10 bg-white min-w-[110px]">{group.producto}</td>
                  <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap sticky left-[110px] z-10 bg-white min-w-[110px]">{group.variedad}</td>
                  <td className="px-3 py-2.5 text-carbon-50 font-semibold whitespace-nowrap sticky left-[220px] z-10 bg-white min-w-[100px] border-r border-surface-border shadow-[2px_0_6px_rgba(0,0,0,0.06)]">{group.color}</td>
                  {DIA_ORDER.map(dia => {
                    const r = group.registros[dia];
                    if (!r) {
                       return <td key={dia} className="px-3 py-2"></td>;
                    }
                    const valCajas = parseFloat(localCajas[r.registroId] ?? r.cajas) || 0;
                    const val = viewMode === 'cajas' ? valCajas : valCajas * (r.divisorTallos || 400);
                    totalFila += val;
                    return (
                      <td key={dia} className="px-2 py-2">
                        {viewMode === 'cajas' ? (
                          <input
                            id={`cajas-${r.registroId}`}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full min-w-[70px] bg-surface-overlay border border-surface-border rounded px-2 py-1 text-carbon-50 font-mono text-xs focus:border-verde-600 focus:ring-1 focus:ring-verde-600 outline-none transition-colors text-right placeholder:text-carbon-400"
                            value={localCajas[r.registroId] ?? (r.cajas === 0 ? '' : Number(r.cajas).toFixed(2))}
                            onChange={(e) => handleChange(r.registroId, e.target.value)}
                            onBlur={() => handleBlur(r)}
                          />
                        ) : (
                          <div className="w-full text-right px-2 py-1 text-carbon-50 font-mono text-xs">
                            {val.toFixed(2)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5 font-mono font-bold text-verde-600 tabular-nums text-right bg-verde-500/10">
                    {totalFila.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-overlay border-t-2 border-surface-border">
              <td colSpan={3} className="px-3 py-2.5 text-right font-bold text-carbon-50 sticky left-0 z-10 bg-surface-overlay min-w-[320px] border-r border-surface-border shadow-[2px_0_6px_rgba(0,0,0,0.06)]">Total general</td>
              {DIA_ORDER.map(dia => {
                let totalColumna = 0;
                groupedRows.forEach(g => {
                  const r = g.registros[dia];
                  if (r) {
                    const valCajas = parseFloat(localCajas[r.registroId] ?? r.cajas) || 0;
                    totalColumna += viewMode === 'cajas' ? valCajas : valCajas * (r.divisorTallos || 400);
                  }
                });
                return (
                  <td key={dia} className="px-3 py-2.5 font-mono font-bold text-carbon-50 tabular-nums text-right">
                    {totalColumna.toFixed(2)}
                  </td>
                );
              })}
              <td className="px-3 py-2.5 font-mono font-bold text-verde-600 tabular-nums text-right bg-verde-500/10">
                {groupedRows.reduce((acc, g) => {
                  let t = 0;
                  DIA_ORDER.forEach(d => {
                    const r = g.registros[d];
                    if (r) {
                      const valCajas = parseFloat(localCajas[r.registroId] ?? r.cajas) || 0;
                      t += viewMode === 'cajas' ? valCajas : valCajas * (r.divisorTallos || 400);
                    }
                  });
                  return acc + t;
                }, 0).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

    </>
  );
}
