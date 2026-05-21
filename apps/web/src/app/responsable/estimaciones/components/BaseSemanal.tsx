'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx-js-style';
import { Download, Eye, Trash2 } from 'lucide-react';
import { FiltrosTabla } from './FiltrosTabla';

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

interface Props { fincaId: string; semanas?: number; startWeek?: number; startYear?: number; }

export function BaseSemanal({ fincaId, semanas = 10, startWeek, startYear }: Props) {
  const qc = useQueryClient();
  const [localEstimaciones, setLocalEstimaciones] = useState<Record<string, string>>({});
  const [peekKey, setPeekKey] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cajas' | 'tallos'>('cajas');
  const [filtroProducto, setFiltroProducto] = useState<string>('');
  const [filtroVariedad, setFiltroVariedad] = useState<string>('');
  const [filtroColor, setFiltroColor] = useState<string>('');

  const { data, isLoading } = useQuery<BaseSemanalResponse>({
    queryKey: ['base-semanal', fincaId, semanas, startWeek, startYear],
    queryFn: () =>
      api.get('/base-semanal', { params: { fincaId, semanas, startWeek, startYear } }).then((r) => r.data),
    enabled: !!fincaId,
  });

  const limpiarEstimaciones = useMutation({
    mutationFn: ({ numeroSemana, anio }: { numeroSemana: number; anio: number }) =>
      api.delete('/base-semanal/estimar-semana', { params: { fincaId, numeroSemana, anio } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['base-semanal', fincaId, semanas] });
      setLocalEstimaciones({});
      toast.success('Estimaciones limpiadas');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al limpiar estimaciones'),
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
    originalValue: number,
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

  const filteredRows = rows.filter(r => {
    const matchProducto = filtroProducto ? r.producto === filtroProducto : true;
    const matchVariedad = filtroVariedad ? r.variedad === filtroVariedad : true;
    const matchColor = filtroColor ? r.color === filtroColor : true;
    return matchProducto && matchVariedad && matchColor;
  });

  const handleDownloadExcel = () => {
    const finca = filteredRows[0]?.finca ?? rows[0]?.finca ?? '';
    const semanaInicio = targetWeeks[0];
    const semanaFin = targetWeeks[targetWeeks.length - 1];
    const ahora = new Date();
    const fechaEmision = ahora.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaEmision = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tipo = viewMode === 'cajas' ? 'Cajas' : 'Tallos';

    const diaHeaders = targetWeeks.map(s => `Sem ${s.numeroSemana}`);
    const tableHeader = ['Producto', 'Variedad', 'Color', ...diaHeaders, 'Total general'];

    type CellState = 'none' | 'estimated' | 'real';
    const cellState: CellState[][] = [];

    const dataRows = filteredRows.map((r, rowIdx) => {
      cellState[rowIdx] = [];
      let totalFila = 0;
      const semCols = targetWeeks.map((s, colIdx) => {
        const key = `${r.colorId}-${s.anio}-${s.numeroSemana}`;
        const d = r.semanas[String(s.numeroSemana)];
        const estimadas = d?.cajasEstimadas ?? 0;
        const reales = d?.cajas ?? 0;
        const realesTallos = d?.tallos ?? 0;
        const isReal = d?.esReal ?? false;
        const valCajas = isReal ? reales : parseFloat(localEstimaciones[key] ?? String(estimadas)) || 0;
        const valTallos = isReal ? realesTallos : valCajas * 400; // Simplified for Excel
        const realVal = viewMode === 'cajas' ? reales : realesTallos;
        const effectiveEst = parseFloat(localEstimaciones[key] ?? String(estimadas)) || 0;
        if (realVal > 0) cellState[rowIdx][colIdx] = 'real';
        else if (effectiveEst > 0) cellState[rowIdx][colIdx] = 'estimated';
        else cellState[rowIdx][colIdx] = 'none';
        const finalVal = viewMode === 'cajas' ? valCajas : valTallos;
        totalFila += finalVal;
        return finalVal;
      });
      return [r.producto, r.variedad, r.color, ...semCols, totalFila];
    });

    const totalCols = tableHeader.length;
    const HEADER_ROWS = 6; // 4 meta + 1 blank + 1 header row
    const DATA_COL_OFFSET = 3; // Producto, Variedad, Color

    const aoa = [
      ['BASE SEMANAL'],
      [`Finca: ${finca}`],
      [`Semanas: ${semanaInicio?.numeroSemana} / ${semanaInicio?.anio}  →  ${semanaFin?.numeroSemana} / ${semanaFin?.anio}`],
      [`Vista: ${tipo}     |     Fecha de emisión: ${fechaEmision} ${horaEmision}`],
      [],
      tableHeader,
      ...dataRows,
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    const STYLE_MAP = {
      real:      { fill: { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } }, font: { color: { rgb: '276221' } }, numFmt: '0.00', alignment: { horizontal: 'center' } },
      estimated: { fill: { patternType: 'solid', fgColor: { rgb: 'FFEB9C' } }, font: { color: { rgb: '9C5700' } }, numFmt: '0.00', alignment: { horizontal: 'center' } },
    };

    Object.keys(ws).forEach(addr => {
      if (addr.startsWith('!')) return;
      const cell = ws[addr];
      if (cell.t === 'n') cell.z = '0.00';
    });

    cellState.forEach((rowCols, rowIdx) => {
      rowCols.forEach((state, colIdx) => {
        if (state === 'none') return;
        const addr = XLSX.utils.encode_cell({ r: HEADER_ROWS + rowIdx, c: DATA_COL_OFFSET + colIdx });
        if (!ws[addr]) return;
        ws[addr].s = STYLE_MAP[state];
      });
    });

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
    ];

    ws['!cols'] = [
      { wch: 18 }, // Producto
      { wch: 18 }, // Variedad
      { wch: 14 }, // Color
      ...targetWeeks.map(() => ({ wch: 12 })),
    ];

    ws['!rows'] = [{ hpt: 22 }, { hpt: 15 }, { hpt: 15 }, { hpt: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Base Semanal');
    XLSX.writeFile(wb, `base_semanal_sem${semanaInicio?.numeroSemana}_${semanaInicio?.anio}_${tipo.toLowerCase()}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-wrap">
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const s = targetWeeks[0];
              if (!s) return;
              if (!window.confirm(`¿Limpiar todas las estimaciones de la semana ${s.numeroSemana}/${s.anio}?`)) return;
              limpiarEstimaciones.mutate({ numeroSemana: s.numeroSemana, anio: s.anio });
            }}
            disabled={limpiarEstimaciones.isPending}
            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 text-red-400 hover:text-red-300"
            title="Limpiar estimaciones de esta semana"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpiar</span>
          </button>
          <button
            onClick={handleDownloadExcel}
            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2"
            title="Descargar Excel"
          >
            <Download className="w-4 h-4" />
            <span>Excel</span>
          </button>
        </div>
      </div>

      <FiltrosTabla
        items={rows}
        filtroProducto={filtroProducto}
        filtroVariedad={filtroVariedad}
        filtroColor={filtroColor}
        onProducto={setFiltroProducto}
        onVariedad={setFiltroVariedad}
        onColor={setFiltroColor}
      />

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="min-w-max w-full text-xs">
        <thead>
          <tr className="bg-surface-overlay border-b border-surface-border">
            <th className="table-th md:sticky md:left-0 z-20 bg-surface-overlay min-w-[110px]">Producto</th>
            <th className="table-th md:sticky md:left-[110px] z-20 bg-surface-overlay min-w-[110px]">Variedad</th>
            <th className="table-th md:sticky md:left-[220px] z-20 bg-surface-overlay min-w-[100px] border-r border-surface-border shadow-[2px_0_6px_rgba(0,0,0,0.06)]">Color</th>
            {targetWeeks.map((s) => (
              <th key={`${s.anio}-${s.numeroSemana}`} className="table-th text-center min-w-[90px]">
                Sem {s.numeroSemana}
              </th>
            ))}
            <th className="table-th text-center min-w-[90px] border-l border-surface-border text-verde-600">
              Total general
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, i) => {
            let totalFila = 0;
            return (
              <tr
                key={row.colorId}
                className={`table-row-hover border-b border-surface-border/30 ${i % 2 === 0 ? '' : 'bg-surface-overlay/15'}`}
              >
                <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap sticky left-0 z-10 bg-white min-w-[110px]">{row.producto}</td>
                <td className="px-3 py-2.5 text-carbon-50 whitespace-nowrap sticky left-[110px] z-10 bg-white min-w-[110px]">{row.variedad}</td>
                <td className="px-3 py-2.5 font-medium text-carbon-50 whitespace-nowrap sticky left-[220px] z-10 bg-white min-w-[100px] border-r border-surface-border shadow-[2px_0_6px_rgba(0,0,0,0.06)]">{row.color}</td>
                  {targetWeeks.map((s) => {
                    const d = row.semanas[String(s.numeroSemana)];
                    const key = `${row.colorId}-${s.anio}-${s.numeroSemana}`;
                    const estimadasCajas = d?.cajasEstimadas ?? 0;
                    const realesCajas = d?.cajas ?? 0;
                    const realesTallos = d?.tallos ?? 0;
                    const estimadasTallos = d?.tallosEstimados ?? 0;
                    const isReal = d?.esReal ?? false;

                    const multiplier = estimadasCajas > 0 ? (estimadasTallos / estimadasCajas) : (realesCajas > 0 ? (realesTallos / realesCajas) : 400);

                    const valCajas = isReal ? realesCajas : parseFloat(localEstimaciones[key] ?? String(estimadasCajas)) || 0;
                    const valTallos = isReal ? realesTallos : valCajas * multiplier;
                    totalFila += (viewMode === 'cajas' ? valCajas : valTallos);

                    const realVal = viewMode === 'cajas' ? realesCajas : realesTallos;
                    const hasReal = realVal > 0;
                    const isPeeking = peekKey === key;
                    const canPeek = hasReal && estimadasCajas > 0;
                    const peekVal = viewMode === 'cajas'
                      ? estimadasCajas.toFixed(2)
                      : estimadasTallos.toFixed(2);

                    return (
                      <td key={key} className="px-2 py-2 w-[90px] group/cell">
                        <div className="flex flex-col items-center w-full">
                          {(() => {
                            if (isPeeking) return (
                              <div className="w-full text-center font-mono font-medium tabular-nums text-xs px-2 py-1 rounded border text-dorado-500 border-dorado-400/50 bg-surface-overlay">
                                {peekVal}
                              </div>
                            );

                            if (hasReal) return (
                              <div className="w-full text-center font-mono font-medium tabular-nums text-xs px-2 py-1 rounded border text-agro-600 border-agro-200 bg-surface-overlay">
                                {realVal.toFixed(2)}
                              </div>
                            );

                            if (viewMode === 'tallos') return (
                              <div className="w-full text-center font-mono tabular-nums text-xs px-2 py-1 rounded border text-carbon-300 border-surface-border bg-surface-overlay">
                                {valTallos.toFixed(2)}
                              </div>
                            );

                            return (
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="w-full bg-surface-overlay border border-surface-border rounded px-2 py-1 text-dorado-500 font-mono text-xs focus:border-dorado-500 focus:ring-1 focus:ring-dorado-500 outline-none transition-colors text-center placeholder:text-carbon-400"
                                value={localEstimaciones[key] ?? (estimadasCajas === 0 ? '' : estimadasCajas.toFixed(2))}
                                onChange={(e) => handleChange(key, e.target.value)}
                                onBlur={() => handleBlur(row.colorId, s.numeroSemana, s.anio, estimadasCajas)}
                              />
                            );
                          })()}
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`text-[9px] ${isPeeking ? 'text-dorado-500' : (viewMode === 'cajas' ? realesCajas : realesTallos) > 0 ? 'text-agro-500 font-medium' : 'text-carbon-400 opacity-70'}`}>
                              {isPeeking ? 'Est.' : (viewMode === 'cajas' ? realesCajas : realesTallos) > 0 ? 'Real' : 'Est.'}
                            </span>
                            {canPeek && (
                              <button
                                type="button"
                                onMouseDown={() => setPeekKey(key)}
                                onMouseUp={() => setPeekKey(null)}
                                onMouseLeave={() => setPeekKey(null)}
                                onTouchStart={() => setPeekKey(key)}
                                onTouchEnd={() => setPeekKey(null)}
                                className="opacity-0 group-hover/cell:opacity-100 transition-opacity text-carbon-400 hover:text-carbon-200"
                                title="Ver estimación"
                              >
                                <Eye className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center w-[90px] border-l border-surface-border">
                    <div className="font-mono text-sm font-bold text-verde-600 tabular-nums">
                      {totalFila.toFixed(2)}
                    </div>
                  </td>
                </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-surface-overlay border-t border-surface-border font-medium shadow-[0_-2px_6px_rgba(0,0,0,0.05)]">
            <td colSpan={3} className="px-3 py-3 text-right text-carbon-200 sticky left-0 z-20 bg-surface-overlay border-r border-surface-border shadow-[2px_0_6px_rgba(0,0,0,0.06)]">
              TOTAL GENERAL
            </td>
            {targetWeeks.map((s) => {
              const total = filteredRows.reduce((acc, row) => {
                const d = row.semanas[String(s.numeroSemana)];
                const key = `${row.colorId}-${s.anio}-${s.numeroSemana}`;
                const estimadasCajas = d?.cajasEstimadas ?? 0;
                const realesCajas = d?.cajas ?? 0;
                const realesTallos = d?.tallos ?? 0;
                const estimadasTallos = d?.tallosEstimados ?? 0;
                const isReal = d?.esReal ?? false;
                const multiplier = estimadasCajas > 0 ? (estimadasTallos / estimadasCajas) : (realesCajas > 0 ? (realesTallos / realesCajas) : 400);
                const valCajas = isReal ? realesCajas : parseFloat(localEstimaciones[key] ?? String(estimadasCajas)) || 0;
                const valTallos = isReal ? realesTallos : valCajas * multiplier;
                return acc + (viewMode === 'cajas' ? valCajas : valTallos);
              }, 0);
              
              return (
                <td key={`total-${s.anio}-${s.numeroSemana}`} className="px-2 py-3 text-center w-[90px]">
                  <div className="font-mono text-sm text-carbon-50 tabular-nums">
                    {total.toFixed(2)}
                  </div>
                </td>
              );
            })}
            <td className="px-2 py-3 text-center w-[90px] border-l border-surface-border">
              <div className="font-mono text-sm font-bold text-verde-600 tabular-nums">
                {filteredRows.reduce((accFila, row) => {
                  return accFila + targetWeeks.reduce((accCol, s) => {
                    const d = row.semanas[String(s.numeroSemana)];
                    const key = `${row.colorId}-${s.anio}-${s.numeroSemana}`;
                    const estimadasCajas = d?.cajasEstimadas ?? 0;
                    const realesCajas = d?.cajas ?? 0;
                    const realesTallos = d?.tallos ?? 0;
                    const estimadasTallos = d?.tallosEstimados ?? 0;
                    const isReal = d?.esReal ?? false;
                    const multiplier = estimadasCajas > 0 ? (estimadasTallos / estimadasCajas) : (realesCajas > 0 ? (realesTallos / realesCajas) : 400);
                    const valCajas = isReal ? realesCajas : parseFloat(localEstimaciones[key] ?? String(estimadasCajas)) || 0;
                    const valTallos = isReal ? realesTallos : valCajas * multiplier;
                    return accCol + (viewMode === 'cajas' ? valCajas : valTallos);
                  }, 0);
                }, 0).toFixed(2)}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
      </div>
    </div>
  );
}
