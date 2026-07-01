'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { ParticipacionColorTable } from './components/ParticipacionColorTable';

function getCurrentWeekAndYear(): { semana: number; anio: number } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { semana: weekNum, anio: d.getUTCFullYear() };
}

const defaults = getCurrentWeekAndYear();

export default function ParticipacionPage() {
  const [semanaInicio, setSemanaInicio] = useState<number | ''>(defaults.semana);
  const [semanaFin, setSemanaFin] = useState<number | ''>(defaults.semana + 9);
  const [anio, setAnio] = useState<number | ''>(defaults.anio);

  const activeCount = [
    semanaInicio !== defaults.semana,
    semanaFin !== defaults.semana + 9,
    anio !== defaults.anio,
  ].filter(Boolean).length;

  const handleReset = () => {
    setSemanaInicio(defaults.semana);
    setSemanaFin(defaults.semana + 9);
    setAnio(defaults.anio);
  };

  const filters = {
    semanaInicio: semanaInicio !== '' && semanaInicio >= 1 ? semanaInicio : undefined,
    semanaFin: semanaFin !== '' && semanaFin >= 1 ? semanaFin : undefined,
    anio: anio !== '' && anio >= 2020 ? anio : undefined,
  };

  return (
    <div className="w-full">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="section-title">Participación por Color</h1>
          <p className="text-carbon-400 text-sm mt-1">
            Porcentaje de cada color sobre el total real de su producto, por semana
          </p>
        </div>
      </div>

      {/* Filter card */}
      <div className="bg-surface-overlay border border-surface-border rounded-lg p-3 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-carbon-400">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
            {activeCount > 0 && (
              <span className="bg-verde-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          {activeCount > 0 && (
            <button
              onClick={handleReset}
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
              value={anio}
              onChange={(e) => setAnio(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="2026"
            />
          </div>
        </div>
      </div>

      <ParticipacionColorTable
        semanaInicio={filters.semanaInicio}
        semanaFin={filters.semanaFin}
        anio={filters.anio}
      />
    </div>
  );
}
