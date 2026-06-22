'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { ConsolidadoDiario } from './components/ConsolidadoDiario';
import { ConsolidadoSemanal } from './components/ConsolidadoSemanal';
import { AuditoriaButton } from '@/app/components/auditoria/AuditoriaButton';

function getCurrentWeekAndYear(): { semana: number; anio: number } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { semana: weekNum, anio: d.getUTCFullYear() };
}

const defaults = getCurrentWeekAndYear();

type Tab = 'diario' | 'semanal';

export default function ConsolidadoPage() {
  const [tab, setTab] = useState<Tab>('diario');

  // ── Filtros Diario ──────────────────────────────────────────────────────────
  const [semana, setSemana] = useState<number | ''>(defaults.semana);
  const [anio, setAnio] = useState<number | ''>(defaults.anio);

  // ── Filtros Semanal ─────────────────────────────────────────────────────────
  const [semanaInicio, setSemanaInicio] = useState<number | ''>(defaults.semana);
  const [semanaFin, setSemanaFin] = useState<number | ''>(defaults.semana + 9);
  const [anioSemanal, setAnioSemanal] = useState<number | ''>(defaults.anio);

  const handleResetDiario = () => {
    setSemana(defaults.semana);
    setAnio(defaults.anio);
  };

  const handleResetSemanal = () => {
    setSemanaInicio(defaults.semana);
    setSemanaFin(defaults.semana + 9);
    setAnioSemanal(defaults.anio);
  };

  const diarioActivos = [
    semana !== defaults.semana,
    anio !== defaults.anio,
  ].filter(Boolean).length;

  const semanalActivos = [
    semanaInicio !== defaults.semana,
    semanaFin !== defaults.semana + 9,
    anioSemanal !== defaults.anio,
  ].filter(Boolean).length;

  const diarioFilters = {
    semana: semana !== '' && semana >= 1 ? semana : undefined,
    anio: anio !== '' && anio >= 2020 ? anio : undefined,
  };

  const semanalFilters = {
    semanaInicio: semanaInicio !== '' && semanaInicio >= 1 ? semanaInicio : undefined,
    semanaFin: semanaFin !== '' && semanaFin >= 1 ? semanaFin : undefined,
    anio: anioSemanal !== '' && anioSemanal >= 2020 ? anioSemanal : undefined,
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="section-title">Consolidado</h1>
          <p className="text-carbon-400 text-sm mt-1">
            Suma total de estimados por producto — todas las fincas y responsables
          </p>
        </div>
        <AuditoriaButton
          modulo="producción"
          moduloLabel="Producción"
          className="w-full sm:w-auto shrink-0"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border w-fit max-w-full overflow-x-auto mb-4">
        <button
          onClick={() => setTab('diario')}
          className={`px-5 py-1.5 text-sm font-medium rounded-sm transition-colors ${
            tab === 'diario'
              ? 'bg-surface-raised text-carbon-50 shadow-sm'
              : 'text-carbon-400 hover:text-carbon-200'
          }`}
        >
          Consolidado Diario
        </button>
        <button
          onClick={() => setTab('semanal')}
          className={`px-5 py-1.5 text-sm font-medium rounded-sm transition-colors ${
            tab === 'semanal'
              ? 'bg-surface-raised text-carbon-50 shadow-sm'
              : 'text-carbon-400 hover:text-carbon-200'
          }`}
        >
          Consolidado Semanal
        </button>
      </div>

      {/* Filtros Diario */}
      {tab === 'diario' && (
        <div className="bg-surface-overlay border border-surface-border rounded-lg p-3 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-carbon-400">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
              {diarioActivos > 0 && (
                <span className="bg-verde-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {diarioActivos}
                </span>
              )}
            </div>
            {diarioActivos > 0 && (
              <button
                onClick={handleResetDiario}
                className="flex items-center gap-1 text-[11px] text-carbon-400 hover:text-carbon-50 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Semana</label>
              <input
                type="number"
                className="input-field text-xs w-28"
                min={1}
                max={53}
                value={semana}
                onChange={(e) => setSemana(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1 – 53"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Año</label>
              <input
                type="number"
                className="input-field text-xs w-28"
                min={2020}
                max={2035}
                value={anio}
                onChange={(e) => setAnio(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2026"
              />
            </div>
          </div>
        </div>
      )}

      {/* Filtros Semanal */}
      {tab === 'semanal' && (
        <div className="bg-surface-overlay border border-surface-border rounded-lg p-3 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-carbon-400">
              <Filter className="w-3.5 h-3.5" />
              <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
              {semanalActivos > 0 && (
                <span className="bg-verde-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {semanalActivos}
                </span>
              )}
            </div>
            {semanalActivos > 0 && (
              <button
                onClick={handleResetSemanal}
                className="flex items-center gap-1 text-[11px] text-carbon-400 hover:text-carbon-50 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Semana inicio</label>
              <input
                type="number"
                className="input-field text-xs w-28"
                min={1}
                max={53}
                value={semanaInicio}
                onChange={(e) => setSemanaInicio(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1 – 53"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Semana fin</label>
              <input
                type="number"
                className="input-field text-xs w-28"
                min={1}
                max={53}
                value={semanaFin}
                onChange={(e) => setSemanaFin(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1 – 53"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Año</label>
              <input
                type="number"
                className="input-field text-xs w-28"
                min={2020}
                max={2035}
                value={anioSemanal}
                onChange={(e) => setAnioSemanal(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2026"
              />
            </div>
          </div>
        </div>
      )}

      {/* Contenido */}
      {tab === 'diario' ? (
        <ConsolidadoDiario {...diarioFilters} />
      ) : (
        <ConsolidadoSemanal {...semanalFilters} />
      )}
    </div>
  );
}
