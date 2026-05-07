'use client';

import { useState } from 'react';
import { BarChart2 } from 'lucide-react';
import { ConsolidadoDiario } from './components/ConsolidadoDiario';
import { ConsolidadoSemanal } from './components/ConsolidadoSemanal';

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
  const [semanaFin, setSemanaFin] = useState<number | ''>(defaults.semana);
  const [anioSemanal, setAnioSemanal] = useState<number | ''>(defaults.anio);

  const handleResetDiario = () => {
    setSemana(defaults.semana);
    setAnio(defaults.anio);
  };

  const handleResetSemanal = () => {
    setSemanaInicio(defaults.semana);
    setSemanaFin(defaults.semana);
    setAnioSemanal(defaults.anio);
  };

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
      <div className="flex items-center gap-3 mb-6">
        <BarChart2 className="w-6 h-6 text-verde-500" />
        <div>
          <h1 className="section-title">Consolidado</h1>
          <p className="text-carbon-400 text-sm mt-0.5">
            Suma total de estimados por producto — todas las fincas y responsables
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border w-fit mb-6">
        <button
          onClick={() => setTab('diario')}
          className={`px-5 py-1.5 text-sm font-medium rounded-sm transition-colors ${tab === 'diario'
              ? 'bg-surface-raised text-carbon-50 shadow-sm'
              : 'text-carbon-400 hover:text-carbon-200'
            }`}
        >
          Consolidado Diario
        </button>
        <button
          onClick={() => setTab('semanal')}
          className={`px-5 py-1.5 text-sm font-medium rounded-sm transition-colors ${tab === 'semanal'
              ? 'bg-surface-raised text-carbon-50 shadow-sm'
              : 'text-carbon-400 hover:text-carbon-200'
            }`}
        >
          Consolidado Semanal
        </button>
      </div>

      {/* Filtros Diario */}
      {tab === 'diario' && (
        <div className="card p-5 mb-6">
          <p className="text-xs font-semibold text-carbon-400 uppercase tracking-wider mb-3">
            Seleccionar semana
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="form-label">Semana</label>
              <input
                type="number"
                className="input-field text-sm w-28"
                min={1}
                max={53}
                value={semana}
                onChange={(e) => setSemana(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="1 – 53"
              />
            </div>
            <div>
              <label className="form-label">Año</label>
              <input
                type="number"
                className="input-field text-sm w-28"
                min={2020}
                max={2035}
                value={anio}
                onChange={(e) => setAnio(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="2026"
              />
            </div>
            <button onClick={handleResetDiario} className="btn-ghost text-xs py-1.5 px-3">
              Restablecer
            </button>
          </div>
        </div>
      )}

      {/* Filtros Semanal */}
      {tab === 'semanal' && (
        <div className="card p-5 mb-6">
          <p className="text-xs font-semibold text-carbon-400 uppercase tracking-wider mb-3">
            Rango de semanas
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="form-label">Semana inicio</label>
              <input
                type="number"
                className="input-field text-sm w-28"
                min={1}
                max={53}
                value={semanaInicio}
                onChange={(e) =>
                  setSemanaInicio(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="1 – 53"
              />
            </div>
            <div>
              <label className="form-label">Semana fin</label>
              <input
                type="number"
                className="input-field text-sm w-28"
                min={1}
                max={53}
                value={semanaFin}
                onChange={(e) =>
                  setSemanaFin(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="1 – 53"
              />
            </div>
            <div>
              <label className="form-label">Año</label>
              <input
                type="number"
                className="input-field text-sm w-28"
                min={2020}
                max={2035}
                value={anioSemanal}
                onChange={(e) =>
                  setAnioSemanal(e.target.value === '' ? '' : Number(e.target.value))
                }
                placeholder="2026"
              />
            </div>
            <button onClick={handleResetSemanal} className="btn-ghost text-xs py-1.5 px-3">
              Restablecer
            </button>
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
