'use client';

import React from 'react';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Download, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { useTableScroll } from '@/lib/useTableScroll';
import { FloatingScrollbar } from '@/lib/FloatingScrollbar';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface FlatRow {
  producto: string;
  variedad: string;
  color: string;
  codigo: string | null;
  nombreOriginal: string | null;
  numeroSemana: number;
  cajasEstimadas: number;
  tallosEstimados: number;
  cajasReales: number;
  tallosReales: number;
}

interface SemanaData {
  cajasEstimadas: number;
  tallosEstimados: number;
  cajasReales: number;
  tallosReales: number;
}

interface PivotRow {
  producto: string;
  variedad: string;
  color: string;
  codigo: string | null;
  nombreOriginal: string | null;
  semanas: Record<number, SemanaData>;
  totalCajasEstimadas: number;
  totalTallosEstimados: number;
  totalCajasReales: number;
  totalTallosReales: number;
}

interface ProductGroup {
  producto: string;
  rows: PivotRow[];
}

interface Props {
  semanaInicio?: number;
  semanaFin?: number;
  anio?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEK_COUNT = 9;

function pivotRows(flat: FlatRow[]): PivotRow[] {
  const map = new Map<string, PivotRow>();
  for (const row of flat) {
    const key = `${row.producto}||${row.variedad}||${row.color}`;
    if (!map.has(key)) {
      map.set(key, {
        producto: row.producto,
        variedad: row.variedad,
        color: row.color,
        codigo: row.codigo,
        nombreOriginal: row.nombreOriginal,
        semanas: {},
        totalCajasEstimadas: 0,
        totalTallosEstimados: 0,
        totalCajasReales: 0,
        totalTallosReales: 0,
      });
    }
    if (row.numeroSemana === 0) continue;

    const entry = map.get(key)!;
    entry.semanas[row.numeroSemana] = {
      cajasEstimadas: row.cajasEstimadas,
      tallosEstimados: row.tallosEstimados,
      cajasReales: row.cajasReales,
      tallosReales: row.tallosReales,
    };
    entry.totalCajasEstimadas =
      Math.round((entry.totalCajasEstimadas + row.cajasEstimadas) * 100) / 100;
    entry.totalTallosEstimados =
      Math.round((entry.totalTallosEstimados + row.tallosEstimados) * 100) / 100;
    entry.totalCajasReales =
      Math.round((entry.totalCajasReales + row.cajasReales) * 100) / 100;
    entry.totalTallosReales =
      Math.round((entry.totalTallosReales + row.tallosReales) * 100) / 100;
  }
  return Array.from(map.values());
}

function groupByProducto(rows: PivotRow[]): ProductGroup[] {
  const map = new Map<string, PivotRow[]>();
  for (const row of rows) {
    if (!map.has(row.producto)) map.set(row.producto, []);
    map.get(row.producto)!.push(row);
  }
  return Array.from(map.entries()).map(([producto, rows]) => ({ producto, rows }));
}

// ── Componente ────────────────────────────────────────────────────────────────

export function ConsolidadoSemanal({ semanaInicio, semanaFin, anio }: Props) {
  const [viewMode, setViewMode] = useState<'cajas' | 'tallos'>('cajas');
  const isCajas = viewMode === 'cajas';
  const { scrollRef, isScrolled, canScrollRight, isVisible, scrollLeft, scrollRight } = useTableScroll(220);

  const { data: flat = [], isLoading } = useQuery<FlatRow[]>({
    queryKey: ['consolidado-semanal', semanaInicio, semanaFin, anio],
    queryFn: () =>
      api
        .get('/consolidado/semanal', { params: { semanaInicio, semanaFin, anio } })
        .then((r) => r.data),
  });

  // Siempre exactamente 10 semanas
  const weekCols: number[] = [];
  if (semanaInicio != null) {
    for (let s = semanaInicio; s < semanaInicio + WEEK_COUNT; s++) weekCols.push(s);
  } else {
    const set = new Set(flat.filter((r) => r.numeroSemana > 0).map((r) => r.numeroSemana));
    Array.from(set)
      .sort((a, b) => a - b)
      .slice(0, WEEK_COUNT)
      .forEach((s) => weekCols.push(s));
  }

  const allRows = pivotRows(flat);
  const groups = groupByProducto(allRows);

  const colTotals: Record<number, SemanaData> = {};
  for (const w of weekCols) {
    colTotals[w] = { cajasEstimadas: 0, tallosEstimados: 0, cajasReales: 0, tallosReales: 0 };
    for (const row of allRows) {
      const s = row.semanas[w];
      if (s) {
        colTotals[w].cajasEstimadas += s.cajasEstimadas;
        colTotals[w].tallosEstimados += s.tallosEstimados;
        colTotals[w].cajasReales += s.cajasReales;
        colTotals[w].tallosReales += s.tallosReales;
      }
    }
  }

  const grandTotal = allRows.reduce(
    (acc, r) => ({
      cajasEst: acc.cajasEst + r.totalCajasEstimadas,
      cajasReal: acc.cajasReal + r.totalCajasReales,
      tallosEst: acc.tallosEst + r.totalTallosEstimados,
      tallosReal: acc.tallosReal + r.totalTallosReales,
    }),
    { cajasEst: 0, cajasReal: 0, tallosEst: 0, tallosReal: 0 },
  );

  // ── Excel ─────────────────────────────────────────────────────────────────

  const handleDownloadExcel = () => {
    const COLORS = {
      VERDE_BG:    '1B3FA0',
      VERDE_LIGHT: 'E8EDF8',
      VERDE_TEXT:  '5A7FCC',
      AGRO_TEXT:   '2E8B3D',
      AGRO_BG:     'ECFDF3',
      DORADO_TEXT: 'DC9B04',
      DORADO_BG:   'FFFBEB',
      CARBON_DARK: '101828',
      CARBON_MID:  '475467',
      SURFACE:     'F2F4F7',
      WHITE:       'FFFFFF',
    };
    const THIN   = { style: 'thin', color: { rgb: 'E4E7EC' } };
    const BORDER = { top: THIN, bottom: THIN, left: THIN, right: THIN };

    const ahora    = new Date();
    const fechaStr = ahora.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr  = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    const FIXED     = 5;
    const totalCols = FIXED + weekCols.length * 2 + 2;

    const buildSheet = (forCajas: boolean) => {
      const tipo     = forCajas ? 'Cajas' : 'Tallos';
      const semLabel = semanaInicio != null
        ? `Semanas ${semanaInicio} – ${semanaInicio + WEEK_COUNT - 1} / ${anio ?? ''}`
        : `Año ${anio ?? ''}`;

      type RowKind = 'title' | 'subtitle' | 'meta' | 'empty' | 'header1' | 'header2' | 'group' | 'data' | 'grandtotal';
      const rowKinds: RowKind[] = [];
      const alternateSet        = new Set<number>();
      const groupSet            = new Set<number>();

      const h1: (string | number)[] = ['Código', 'Producto', 'Nombre Original', 'Variedad', 'Color'];
      const h2: (string | number)[] = ['', '', '', '', ''];
      weekCols.forEach((w) => { h1.push(`Sem ${w}`, ''); h2.push('Est.', 'Real'); });
      h1.push('Total', '');
      h2.push('Est.', 'Real');

      const aoa: (string | number)[][] = [
        ['CONSOLIDADO SEMANAL'],
        [`${semLabel}   |   Vista: ${tipo}`],
        [`Exportado: ${fechaStr} ${horaStr}`],
        [],
        h1,
        h2,
      ];
      rowKinds.push('title', 'subtitle', 'meta', 'empty', 'header1', 'header2');

      for (const group of groups) {
        const gEst  = group.rows.reduce((s, r) => s + (forCajas ? r.totalCajasEstimadas : r.totalTallosEstimados), 0);
        const gReal = group.rows.reduce((s, r) => s + (forCajas ? r.totalCajasReales    : r.totalTallosReales),    0);
        const gRow  = new Array<string | number>(totalCols).fill('');
        gRow[0]            = group.producto.toUpperCase();
        gRow[totalCols - 2] = `Est: ${gEst.toFixed(2)}`;
        gRow[totalCols - 1] = `Real: ${gReal.toFixed(2)}`;
        aoa.push(gRow);
        groupSet.add(aoa.length - 1);
        rowKinds.push('group');

        group.rows.forEach((r, i) => {
          const row: (string | number)[] = [
            r.codigo || '—', r.producto, r.nombreOriginal || '—', r.variedad, r.color,
          ];
          weekCols.forEach((w) => {
            const s = r.semanas[w];
            row.push(s ? (forCajas ? s.cajasEstimadas  : s.tallosEstimados) : 0);
            row.push(s ? (forCajas ? s.cajasReales      : s.tallosReales)    : 0);
          });
          row.push(forCajas ? r.totalCajasEstimadas  : r.totalTallosEstimados);
          row.push(forCajas ? r.totalCajasReales      : r.totalTallosReales);
          aoa.push(row);
          if (i % 2 !== 0) alternateSet.add(aoa.length - 1);
          rowKinds.push('data');
        });
      }

      const gtRow = new Array<string | number>(totalCols).fill('');
      gtRow[0] = 'TOTAL GENERAL';
      weekCols.forEach((w, wi) => {
        const ct = colTotals[w];
        gtRow[FIXED + wi * 2]     = forCajas ? ct.cajasEstimadas  : ct.tallosEstimados;
        gtRow[FIXED + wi * 2 + 1] = forCajas ? ct.cajasReales      : ct.tallosReales;
      });
      gtRow[totalCols - 2] = forCajas ? grandTotal.cajasEst  : grandTotal.tallosEst;
      gtRow[totalCols - 1] = forCajas ? grandTotal.cajasReal  : grandTotal.tallosReal;
      aoa.push(gtRow);
      rowKinds.push('grandtotal');

      const ws = XLSX.utils.aoa_to_sheet(aoa);

      ws['!cols'] = [
        { wch: 12 }, { wch: 22 }, { wch: 24 }, { wch: 20 }, { wch: 14 },
        ...weekCols.flatMap(() => [{ wch: 11 }, { wch: 11 }]),
        { wch: 12 }, { wch: 12 },
      ];
      ws['!rows'] = aoa.map((_, i) => {
        if (i === 0) return { hpt: 28 };
        if (i === 4 || i === 5) return { hpt: 20 };
        return { hpt: 17 };
      });
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
        { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
        { s: { r: 4, c: 1 }, e: { r: 5, c: 1 } },
        { s: { r: 4, c: 2 }, e: { r: 5, c: 2 } },
        { s: { r: 4, c: 3 }, e: { r: 5, c: 3 } },
        { s: { r: 4, c: 4 }, e: { r: 5, c: 4 } },
        { s: { r: 4, c: FIXED + weekCols.length * 2 }, e: { r: 4, c: totalCols - 1 } },
        { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: FIXED - 1 } },
      ];
      weekCols.forEach((_, wi) => {
        ws['!merges']!.push({
          s: { r: 4, c: FIXED + wi * 2 },
          e: { r: 4, c: FIXED + wi * 2 + 1 },
        });
      });
      for (const gIdx of groupSet) {
        ws['!merges']!.push({ s: { r: gIdx, c: 0 }, e: { r: gIdx, c: FIXED - 1 } });
      }

      for (let R = 0; R < aoa.length; R++) {
        for (let col = 0; col < totalCols; col++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: col });
          if (!ws[addr]) ws[addr] = { t: 's', v: '' };
          const cell        = ws[addr];
          const kind        = rowKinds[R];
          const isDataCol   = col >= FIXED;
          const offset      = col - FIXED;
          const wkCount     = weekCols.length;
          const isEstCol    = isDataCol && offset < wkCount * 2 && offset % 2 === 0;
          const isTotalEst  = col === totalCols - 2;
          const isTotalReal = col === totalCols - 1;
          const isAlt       = alternateSet.has(R);

          if (kind === 'title') {
            cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.VERDE_BG } },
              font: { color: { rgb: COLORS.WHITE }, bold: true, sz: 14 },
              alignment: { horizontal: 'center', vertical: 'center' } };
          } else if (kind === 'subtitle') {
            cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.VERDE_LIGHT } },
              font: { color: { rgb: COLORS.CARBON_DARK }, bold: true, sz: 10 },
              alignment: { horizontal: 'center', vertical: 'center' } };
          } else if (kind === 'meta') {
            cell.s = { font: { color: { rgb: COLORS.CARBON_MID }, sz: 9, italic: true },
              alignment: { horizontal: 'center', vertical: 'center' } };
          } else if (kind === 'header1') {
            cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.VERDE_BG } },
              font: { color: { rgb: COLORS.WHITE }, bold: true, sz: 9 },
              alignment: { horizontal: col < FIXED ? 'left' : 'center', vertical: 'center' },
              border: BORDER };
          } else if (kind === 'header2') {
            if (col < FIXED) {
              cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.VERDE_BG } },
                font: { color: { rgb: COLORS.WHITE }, bold: true, sz: 9 },
                border: BORDER };
            } else if (isEstCol || isTotalEst) {
              cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.DORADO_BG } },
                font: { color: { rgb: COLORS.DORADO_TEXT }, bold: true, sz: 9 },
                alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER };
            } else {
              cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.AGRO_BG } },
                font: { color: { rgb: COLORS.AGRO_TEXT }, bold: true, sz: 9 },
                alignment: { horizontal: 'center', vertical: 'center' }, border: BORDER };
            }
          } else if (kind === 'group') {
            cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.VERDE_LIGHT } },
              font: { color: { rgb: col < FIXED ? COLORS.VERDE_BG : COLORS.VERDE_TEXT }, bold: true, sz: 9 },
              alignment: { horizontal: col < FIXED ? 'left' : 'center', vertical: 'center' },
              border: BORDER };
          } else if (kind === 'data') {
            const bg = isAlt ? COLORS.SURFACE : COLORS.WHITE;
            if (!isDataCol) {
              cell.s = { fill: { patternType: 'solid', fgColor: { rgb: bg } },
                font: { color: { rgb: COLORS.CARBON_DARK }, bold: col === 3 || col === 4, sz: 9 },
                alignment: { horizontal: 'left', vertical: 'center' }, border: BORDER };
            } else if (isEstCol || isTotalEst) {
              cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.DORADO_BG } },
                font: { color: { rgb: COLORS.DORADO_TEXT }, bold: isTotalEst, sz: 9 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: BORDER, numFmt: '0.00' };
              if (typeof cell.v === 'number') cell.z = '0.00';
            } else {
              cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.AGRO_BG } },
                font: { color: { rgb: COLORS.AGRO_TEXT }, bold: isTotalReal, sz: 9 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: BORDER, numFmt: '0.00' };
              if (typeof cell.v === 'number') cell.z = '0.00';
            }
          } else if (kind === 'grandtotal') {
            if (!isDataCol) {
              cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.VERDE_BG } },
                font: { color: { rgb: COLORS.WHITE }, bold: true, sz: 9 },
                alignment: { horizontal: 'left', vertical: 'center' }, border: BORDER };
            } else if (isEstCol || isTotalEst) {
              cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.DORADO_TEXT } },
                font: { color: { rgb: COLORS.WHITE }, bold: true, sz: 9 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: BORDER, numFmt: '0.00' };
              if (typeof cell.v === 'number') cell.z = '0.00';
            } else {
              cell.s = { fill: { patternType: 'solid', fgColor: { rgb: COLORS.AGRO_TEXT } },
                font: { color: { rgb: COLORS.WHITE }, bold: true, sz: 9 },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: BORDER, numFmt: '0.00' };
              if (typeof cell.v === 'number') cell.z = '0.00';
            }
          }
        }
      }

      return ws;
    };

    const wb    = XLSX.utils.book_new();
    const rango = semanaInicio ? `sem${semanaInicio}-${semanaInicio + WEEK_COUNT - 1}` : 'sem_all';
    XLSX.utils.book_append_sheet(wb, buildSheet(true),  'Cajas');
    XLSX.utils.book_append_sheet(wb, buildSheet(false), 'Tallos');
    XLSX.writeFile(wb, `consolidado_semanal_${rango}_${anio ?? ''}.xlsx`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="h-9 bg-surface-overlay rounded animate-pulse"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
    );
  }

  if (allRows.length === 0) {
    return (
      <div className="empty-state">
        Sin datos semanales para el rango seleccionado
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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

      {/* Tabla */}
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border border-surface-border scrollbar-always"
        style={{ scrollbarGutter: 'stable' }}
      >
        <table className="min-w-max w-full text-xs">
          <thead>
            {/* Fila 1: número de semana */}
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th md:sticky md:left-0 z-20 bg-surface-overlay min-w-[130px]" rowSpan={2}>Producto</th>
              <th className="table-th md:sticky md:left-[130px] z-20 bg-surface-overlay min-w-[120px]" rowSpan={2}>Variedad</th>
              <th className={`table-th md:sticky md:left-[250px] z-20 bg-surface-overlay min-w-[110px] border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`} rowSpan={2}>Color</th>
              <th className="table-th min-w-[90px] border-r border-surface-border/40 text-carbon-200" rowSpan={2}>Código</th>
              <th className="table-th min-w-[150px] border-r border-surface-border/40 text-carbon-200" rowSpan={2}>Nombre Original</th>
              {weekCols.map((w) => (
                <th
                  key={w}
                  colSpan={2}
                  className="table-th text-center min-w-[120px] border-l border-surface-border/40 text-carbon-200"
                >
                  Sem {w}
                </th>
              ))}
              <th
                colSpan={2}
                className="table-th text-center min-w-[120px] border-l border-surface-border text-verde-400"
              >
                Total
              </th>
            </tr>
            {/* Fila 2: Est. / Real por semana */}
            <tr className="bg-surface-overlay border-b border-surface-border">
              {weekCols.map((w) => (
                <React.Fragment key={w}>
                  <th className="table-th text-center text-[10px] font-normal text-dorado-400 border-l border-surface-border/40">
                    Est.
                  </th>
                  <th className="table-th text-center text-[10px] font-normal text-agro-400">
                    Real
                  </th>
                </React.Fragment>
              ))}
              <th className="table-th text-center text-[10px] font-normal text-dorado-400 border-l border-surface-border">
                Est.
              </th>
              <th className="table-th text-center text-[10px] font-normal text-agro-400">
                Real
              </th>
            </tr>
          </thead>

          <tbody>
            {groups.map((group) => {
              const groupEst = group.rows.reduce(
                (s, r) => s + (isCajas ? r.totalCajasEstimadas : r.totalTallosEstimados),
                0,
              );
              const groupReal = group.rows.reduce(
                (s, r) => s + (isCajas ? r.totalCajasReales : r.totalTallosReales),
                0,
              );
              const hasData = group.rows.some((r) => Object.keys(r.semanas).length > 0);

              return (
                <React.Fragment key={`group-${group.producto}`}>
                  {/* Encabezado de grupo — Producto */}
                  <tr className="bg-surface-overlay border-t border-surface-border">
                    <td
                      colSpan={5}
                      className="px-3 py-1.5 md:sticky md:left-0 z-10 bg-surface-overlay"
                    >
                      <span className="text-[11px] font-bold uppercase tracking-widest text-verde-400">
                        {group.producto}
                      </span>
                    </td>
                    <td
                      colSpan={weekCols.length * 2 + 2}
                      className="px-3 py-1.5 text-right"
                    >
                      <span className={`text-[10px] font-mono tabular-nums font-semibold ${hasData ? 'text-verde-300' : 'text-carbon-600'}`}>
                        {isCajas ? 'Cajas' : 'Tallos'} — Est.: {groupEst.toFixed(2)} · Real: {groupReal.toFixed(2)}
                      </span>
                    </td>
                  </tr>

                  {/* Filas de variedad/color */}
                  {group.rows.map((row, i) => {
                    const sinDatos = Object.keys(row.semanas).length === 0;
                    const totalEst = isCajas ? row.totalCajasEstimadas : row.totalTallosEstimados;
                    const totalReal = isCajas ? row.totalCajasReales : row.totalTallosReales;
                    return (
                      <tr
                        key={`${row.producto}-${row.variedad}-${row.color}`}
                        className={`table-row-hover border-b border-surface-border/20 transition-opacity ${
                          sinDatos ? 'opacity-40' : ''
                        } ${i % 2 === 0 ? '' : 'bg-surface-overlay/10'}`}
                      >
                        <td className="px-3 py-2 text-carbon-700 whitespace-nowrap text-[11px] md:sticky md:left-0 z-10 bg-white min-w-[130px]" />
                        <td className="px-3 py-2 text-carbon-200 whitespace-nowrap md:sticky md:left-[130px] z-10 bg-white min-w-[120px]">{row.variedad}</td>
                        <td className={`px-3 py-2 font-medium text-carbon-100 whitespace-nowrap md:sticky md:left-[250px] z-10 bg-white min-w-[110px] border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}>{row.color}</td>
                        <td className="px-3 py-2 text-carbon-300 font-mono text-[11px] whitespace-nowrap border-r border-surface-border/20">{row.codigo || <span className="text-carbon-600">—</span>}</td>
                        <td className="px-3 py-2 text-carbon-300 text-[11px] whitespace-nowrap italic border-r border-surface-border/20">{row.nombreOriginal || <span className="text-carbon-600">—</span>}</td>
                        {weekCols.map((w) => {
                          const s = row.semanas[w];
                          const est = s ? (isCajas ? s.cajasEstimadas : s.tallosEstimados) : null;
                          const real = s ? (isCajas ? s.cajasReales : s.tallosReales) : null;
                          return (
                            <React.Fragment key={w}>
                              <td className="px-2 py-2 text-center font-mono tabular-nums text-dorado-500 border-l border-surface-border/20">
                                {est !== null && est > 0 ? est.toFixed(2) : <span className="text-carbon-700">—</span>}
                              </td>
                              <td className="px-2 py-2 text-center font-mono tabular-nums text-agro-500">
                                {real !== null && real > 0 ? real.toFixed(2) : <span className="text-carbon-700">—</span>}
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {/* Total fila */}
                        <td className="px-2 py-2 text-center font-mono tabular-nums font-semibold text-dorado-400 border-l border-surface-border">
                          {totalEst > 0 ? totalEst.toFixed(2) : <span className="text-carbon-700">—</span>}
                        </td>
                        <td className="px-2 py-2 text-center font-mono tabular-nums font-semibold text-agro-400">
                          {totalReal > 0 ? totalReal.toFixed(2) : <span className="text-carbon-700">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-surface-border bg-surface-overlay">
              <td
                colSpan={5}
                className={`px-3 py-2.5 text-xs font-semibold text-carbon-200 uppercase tracking-wide md:sticky md:left-0 z-10 bg-surface-overlay border-r border-surface-border transition-shadow ${isScrolled ? 'shadow-[2px_0_8px_rgba(0,0,0,0.15)]' : ''}`}
              >
                Total general
              </td>
              {weekCols.map((w) => {
                const ct = colTotals[w];
                const est = isCajas ? ct.cajasEstimadas : ct.tallosEstimados;
                const real = isCajas ? ct.cajasReales : ct.tallosReales;
                return (
                  <React.Fragment key={w}>
                    <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-dorado-400 border-l border-surface-border/30">
                      {est > 0 ? est.toFixed(2) : <span className="text-carbon-600">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-agro-400">
                      {real > 0 ? real.toFixed(2) : <span className="text-carbon-600">—</span>}
                    </td>
                  </React.Fragment>
                );
              })}
              <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-dorado-400 border-l border-surface-border">
                {(isCajas ? grandTotal.cajasEst : grandTotal.tallosEst).toFixed(2)}
              </td>
              <td className="px-2 py-2.5 text-center font-mono tabular-nums font-bold text-agro-400">
                {(isCajas ? grandTotal.cajasReal : grandTotal.tallosReal).toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <FloatingScrollbar scrollRef={scrollRef} isVisible={isVisible} />
    </div>
  );
}
