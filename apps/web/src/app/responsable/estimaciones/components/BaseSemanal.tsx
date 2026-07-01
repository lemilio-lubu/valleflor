'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx-js-style';
import { Download, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { FiltrosTabla } from './FiltrosTabla';
import { useTableScroll } from '@/lib/useTableScroll';
import { FloatingScrollbar } from '@/lib/FloatingScrollbar';

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
interface ColorInfo {
  id: string;
  codigo: string | null;
  nombreComercial: string | null;
}

interface VariedadGroup {
  variedad: string;
  rows: MatrizRow[];
}
interface ProductoGroup {
  producto: string;
  variedades: VariedadGroup[];
}

function groupRows(rows: MatrizRow[]): ProductoGroup[] {
  const prodMap = new Map<string, Map<string, MatrizRow[]>>();
  for (const row of rows) {
    if (!prodMap.has(row.producto)) prodMap.set(row.producto, new Map());
    const varMap = prodMap.get(row.producto)!;
    if (!varMap.has(row.variedad)) varMap.set(row.variedad, []);
    varMap.get(row.variedad)!.push(row);
  }
  return Array.from(prodMap.entries()).map(([producto, varMap]) => ({
    producto,
    variedades: Array.from(varMap.entries()).map(([variedad, rows]) => ({ variedad, rows })),
  }));
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
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const { scrollRef, isScrolled, canScrollRight, isVisible, scrollLeft, scrollRight } = useTableScroll(220);

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

  const handleDownloadExcel = async () => {
    setIsExportingExcel(true);
    try {
      const colores: ColorInfo[] = await api.get('/colores').then((r) => r.data);
      const colorMap = new Map(colores.map((c) => [c.id, c]));

      const finca = filteredRows[0]?.finca ?? rows[0]?.finca ?? '';
      const semanaInicio = targetWeeks[0];
      const semanaFin = targetWeeks[targetWeeks.length - 1];
      const ahora = new Date();
      const fechaEmision = ahora.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const horaEmision = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const tipo = viewMode === 'cajas' ? 'Cajas' : 'Tallos';

      const diaHeaders = targetWeeks.map(s => `Sem ${s.numeroSemana}`);
      const tableHeader = ['Código', 'Nombre comercial', 'Producto', 'Variedad', 'Color', ...diaHeaders, 'Total general'];
      const totalCols = tableHeader.length;
      const DATA_COL_OFFSET = 5; // Código, Nombre comercial, Producto, Variedad, Color

      type CellState = 'none' | 'estimated' | 'real';
      const cellStateByRow: Record<number, CellState[]> = {};
      const groupRowSet = new Set<number>();
      const dataSectionRows: (string | number)[][] = [];
      const weekGrandTotals = new Array(targetWeeks.length).fill(0);
      let grandTotal = 0;

      for (const group of groupRows(filteredRows)) {
        const builtRows = group.variedades.flatMap((v) => v.rows).map((r) => {
          const rowState: CellState[] = [];
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
            rowState[colIdx] = realVal > 0 ? 'real' : effectiveEst > 0 ? 'estimated' : 'none';
            const finalVal = viewMode === 'cajas' ? valCajas : valTallos;
            totalFila += finalVal;
            return finalVal;
          });
          const colorInfo = colorMap.get(r.colorId);
          return {
            cells: [colorInfo?.codigo || '—', colorInfo?.nombreComercial || '—', r.producto, r.variedad, r.color, ...semCols, totalFila],
            weekVals: semCols,
            total: totalFila,
            state: rowState,
          };
        });

        const groupTotal = builtRows.reduce((s, br) => s + br.total, 0);
        const groupRow = new Array<string | number>(totalCols).fill('');
        groupRow[0] = group.producto.toUpperCase();
        targetWeeks.forEach((_, wi) => {
          groupRow[DATA_COL_OFFSET + wi] = builtRows.reduce((s, br) => s + br.weekVals[wi], 0);
        });
        groupRow[totalCols - 1] = groupTotal;
        dataSectionRows.push(groupRow);
        groupRowSet.add(dataSectionRows.length - 1);

        for (const br of builtRows) {
          dataSectionRows.push(br.cells);
          cellStateByRow[dataSectionRows.length - 1] = br.state;
          br.weekVals.forEach((v, i) => { weekGrandTotals[i] += v; });
          grandTotal += br.total;
        }
      }

      const totalRow = new Array<string | number>(totalCols).fill('');
      totalRow[0] = 'TOTAL GENERAL';
      weekGrandTotals.forEach((v, i) => { totalRow[DATA_COL_OFFSET + i] = v; });
      totalRow[totalCols - 1] = grandTotal;
      dataSectionRows.push(totalRow);
      const totalRowIdx = dataSectionRows.length - 1;

      const HEADER_ROWS = 6; // 4 meta + 1 blank + 1 header row

      const aoa = [
        ['BASE SEMANAL'],
        [`Finca: ${finca}`],
        [`Semanas: ${semanaInicio?.numeroSemana} / ${semanaInicio?.anio}  →  ${semanaFin?.numeroSemana} / ${semanaFin?.anio}`],
        [`Vista: ${tipo}     |     Fecha de emisión: ${fechaEmision} ${horaEmision}`],
        [],
        tableHeader,
        ...dataSectionRows,
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const STYLE_MAP = {
        real:      { fill: { patternType: 'solid', fgColor: { rgb: 'C6EFCE' } }, font: { color: { rgb: '276221' } }, numFmt: '0.00', alignment: { horizontal: 'center' } },
        estimated: { fill: { patternType: 'solid', fgColor: { rgb: 'FFEB9C' } }, font: { color: { rgb: '9C5700' } }, numFmt: '0.00', alignment: { horizontal: 'center' } },
      };
      const GROUP_STYLE = { fill: { patternType: 'solid', fgColor: { rgb: 'E8EDF8' } }, font: { bold: true, color: { rgb: '1B3FA0' } } };
      const TOTAL_STYLE = { fill: { patternType: 'solid', fgColor: { rgb: '1B3FA0' } }, font: { bold: true, color: { rgb: 'FFFFFF' } } };

      Object.keys(ws).forEach(addr => {
        if (addr.startsWith('!')) return;
        const cell = ws[addr];
        if (cell.t === 'n') cell.z = '0.00';
      });

      Object.entries(cellStateByRow).forEach(([rowIdx, states]) => {
        states.forEach((state, colIdx) => {
          if (state === 'none') return;
          const addr = XLSX.utils.encode_cell({ r: HEADER_ROWS + Number(rowIdx), c: DATA_COL_OFFSET + colIdx });
          if (!ws[addr]) return;
          ws[addr].s = STYLE_MAP[state];
        });
      });

      groupRowSet.forEach((rowIdx) => {
        for (let c = 0; c < totalCols; c++) {
          const addr = XLSX.utils.encode_cell({ r: HEADER_ROWS + rowIdx, c });
          if (!ws[addr]) ws[addr] = { t: 's', v: '' };
          ws[addr].s = GROUP_STYLE;
        }
      });

      for (let c = 0; c < totalCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: HEADER_ROWS + totalRowIdx, c });
        if (!ws[addr]) ws[addr] = { t: 's', v: '' };
        ws[addr].s = TOTAL_STYLE;
      }

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
        ...Array.from(groupRowSet).map((rowIdx) => ({
          s: { r: HEADER_ROWS + rowIdx, c: 0 }, e: { r: HEADER_ROWS + rowIdx, c: DATA_COL_OFFSET - 1 },
        })),
      ];

      ws['!cols'] = [
        { wch: 12 }, // Código
        { wch: 24 }, // Nombre comercial
        { wch: 18 }, // Producto
        { wch: 18 }, // Variedad
        { wch: 14 }, // Color
        ...targetWeeks.map(() => ({ wch: 12 })),
      ];

      ws['!rows'] = [{ hpt: 22 }, { hpt: 15 }, { hpt: 15 }, { hpt: 15 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Base Semanal');
      XLSX.writeFile(wb, `base_semanal_sem${semanaInicio?.numeroSemana}_${semanaInicio?.anio}_${tipo.toLowerCase()}.xlsx`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al generar el Excel');
    } finally {
      setIsExportingExcel(false);
    }
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
            disabled={isExportingExcel}
            className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar Excel"
          >
            <Download className={`w-4 h-4 ${isExportingExcel ? 'animate-pulse' : ''}`} />
            <span>{isExportingExcel ? 'Generando…' : 'Excel'}</span>
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

      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border border-surface-border scrollbar-always"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="min-w-max w-full text-xs">
        <thead>
          <tr className="bg-surface-overlay border-b border-surface-border">
            <th className="table-th md:sticky md:left-0 z-20 bg-surface-overlay min-w-[110px]">Producto</th>
            <th className="table-th md:sticky md:left-[110px] z-20 bg-surface-overlay min-w-[110px]">Variedad</th>
            <th className={`table-th md:sticky md:left-[220px] z-20 bg-surface-overlay min-w-[100px] border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}>Color</th>
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
          {groupRows(filteredRows).map((group) => {
            // Compute producto-level total (all weeks × all rows in group)
            const productoTotal = group.variedades.reduce((pAcc, vg) =>
              pAcc + vg.rows.reduce((rAcc, row) =>
                rAcc + targetWeeks.reduce((wAcc, s) => {
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
                  return wAcc + (viewMode === 'cajas' ? valCajas : valTallos);
                }, 0)
              , 0)
            , 0);

            return (
              <React.Fragment key={group.producto}>
                {/* ── Product group header — subtotal por semana ── */}
                <tr className="bg-surface-overlay border-t border-surface-border">
                  <td colSpan={3} className={`px-3 py-1.5 md:sticky md:left-0 z-10 bg-surface-overlay border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-verde-400">
                      {group.producto}
                    </span>
                  </td>
                  {targetWeeks.map((s) => {
                    const colTotal = group.variedades.reduce((accV, vg) =>
                      accV + vg.rows.reduce((acc, row) => {
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
                      }, 0)
                    , 0);
                    return (
                      <td key={`psub-${group.producto}-${s.anio}-${s.numeroSemana}`} className="px-2 py-1.5 text-center w-[90px]">
                        <span className="font-mono text-xs tabular-nums text-verde-300 font-semibold">
                          {colTotal > 0 ? colTotal.toFixed(2) : <span className="text-carbon-600">—</span>}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center w-[90px] border-l border-surface-border">
                    <span className="font-mono text-xs font-bold text-verde-500 tabular-nums">
                      {productoTotal.toFixed(2)}
                    </span>
                  </td>
                </tr>

                {group.variedades.map((vg) => {
                  // Variety subtotal (all weeks × all colors in this variety)
                  const variedadTotal = vg.rows.reduce((rAcc, row) =>
                    rAcc + targetWeeks.reduce((wAcc, s) => {
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
                      return wAcc + (viewMode === 'cajas' ? valCajas : valTallos);
                    }, 0)
                  , 0);

                  return (
                    <React.Fragment key={vg.variedad}>
                      {vg.rows.map((row, i) => {
                        let totalFila = 0;
                        return (
                          <tr
                            key={row.colorId}
                            className={`table-row-hover border-b border-surface-border/30 ${i % 2 === 0 ? '' : 'bg-surface-overlay/15'}`}
                          >
                            <td className="px-3 py-2.5 text-carbon-400 whitespace-nowrap sticky left-0 z-10 bg-white min-w-[110px] text-[11px]">
                              {/* Producto omitted — shown in group header */}
                            </td>
                            <td className="px-3 py-2.5 text-carbon-200 whitespace-nowrap sticky left-[110px] z-10 bg-white min-w-[110px]">{row.variedad}</td>
                            <td className={`px-3 py-2.5 font-medium text-carbon-50 whitespace-nowrap sticky left-[220px] z-10 bg-white min-w-[100px] border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}>{row.color}</td>
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
                              const peekVal = viewMode === 'cajas' ? estimadasCajas.toFixed(2) : estimadasTallos.toFixed(2);
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
                                      <span className={`text-[9px] ${isPeeking ? 'text-dorado-500' : realVal > 0 ? 'text-agro-500 font-medium' : 'text-carbon-400 opacity-70'}`}>
                                        {isPeeking ? 'Est.' : realVal > 0 ? 'Real' : 'Est.'}
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

                      {/* ── Variety subtotal row ── */}
                      {vg.rows.length > 1 && (
                        <tr className="border-b border-surface-border bg-surface-overlay/40">
                          <td className="px-3 py-1.5 md:sticky md:left-0 z-10 bg-surface-overlay/40 min-w-[110px]"></td>
                          <td
                            colSpan={2}
                            className={`px-3 py-1.5 text-[10px] font-semibold text-carbon-300 uppercase tracking-wide md:sticky md:left-[110px] z-10 bg-surface-overlay/40 min-w-[210px] border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}
                          >
                            Subtotal {vg.variedad}
                          </td>
                          {targetWeeks.map((s) => {
                            const colTotal = vg.rows.reduce((acc, row) => {
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
                              <td key={`vsub-${vg.variedad}-${s.anio}-${s.numeroSemana}`} className="px-2 py-1.5 text-center w-[90px]">
                                <span className="font-mono text-xs tabular-nums text-carbon-200 font-semibold">
                                  {colTotal > 0 ? colTotal.toFixed(2) : <span className="text-carbon-600">—</span>}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-center w-[90px] border-l border-surface-border">
                            <span className="font-mono text-xs font-bold text-verde-500 tabular-nums">
                              {variedadTotal.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-surface-overlay border-t border-surface-border font-medium shadow-[0_-2px_6px_rgba(0,0,0,0.05)]">
            <td colSpan={3} className={`px-3 py-3 text-right text-carbon-200 sticky left-0 z-20 bg-surface-overlay border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}>
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
      <FloatingScrollbar scrollRef={scrollRef} isVisible={isVisible} />
    </div>
  );
}
