'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { BarChart2, Filter, X } from 'lucide-react';
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

interface Finca {
  id: string;
  nombre: string;
}

interface Responsable {
  id: string;
  user: { nombre: string | null; email: string };
}

type Tab = 'diario' | 'semanal';

export default function ConsolidadoPage() {
  const [tab, setTab] = useState<Tab>('diario');
  const [fincaId, setFincaId] = useState('');
  const [responsableId, setResponsableId] = useState('');
  const [semana, setSemana] = useState<number | ''>(defaults.semana);
  const [anio, setAnio] = useState<number | ''>(defaults.anio);

  const { data: fincas = [] } = useQuery<Finca[]>({
    queryKey: ['fincas'],
    queryFn: () => api.get('/fincas').then((r) => r.data),
  });

  const { data: responsables = [] } = useQuery<Responsable[]>({
    queryKey: ['responsables-finca', fincaId],
    queryFn: () => api.get(`/fincas/${fincaId}/responsables`).then((r) => r.data),
    enabled: !!fincaId,
  });

  const handleFincaChange = (id: string) => {
    setFincaId(id);
    setResponsableId('');
  };

  const handleReset = () => {
    setFincaId('');
    setResponsableId('');
    setSemana(defaults.semana);
    setAnio(defaults.anio);
  };

  const filters = {
    fincaId: fincaId || undefined,
    responsableId: responsableId || undefined,
    semana: semana !== '' && semana >= 1 ? semana : undefined,
    anio: anio !== '' && anio >= 2020 ? anio : undefined,
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="section-title">Consolidado</h1>
        <p className="text-carbon-400 text-sm mt-1">Vista consolidada de estimados diarios y semanales por finca, responsable y semana</p>
      </div>

      {/* Filtros */}
      {(() => {
        const activos = [fincaId, responsableId, semana !== defaults.semana ? semana : '', anio !== defaults.anio ? anio : ''].filter(Boolean).length;
        return (
          <div className="bg-surface-overlay border border-surface-border rounded-lg p-3 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-carbon-400">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
                {activos > 0 && (
                  <span className="bg-verde-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {activos}
                  </span>
                )}
              </div>
              {activos > 0 && (
                <button onClick={handleReset} className="flex items-center gap-1 text-[11px] text-carbon-400 hover:text-carbon-50 transition-colors">
                  <X className="w-3 h-3" />
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Finca</label>
                <div className="relative">
                  <select className="input-field text-xs w-full pr-7" value={fincaId} onChange={(e) => handleFincaChange(e.target.value)}>
                    <option value="">Todas</option>
                    {fincas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                  {fincaId && (
                    <button onClick={() => handleFincaChange('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Responsable</label>
                <div className="relative">
                  <select className="input-field text-xs w-full pr-7 disabled:opacity-50 disabled:cursor-not-allowed" value={responsableId} onChange={(e) => setResponsableId(e.target.value)} disabled={!fincaId}>
                    <option value="">Todos</option>
                    {responsables.map((r) => <option key={r.id} value={r.id}>{r.user.nombre || r.user.email}</option>)}
                  </select>
                  {responsableId && (
                    <button onClick={() => setResponsableId('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Semana</label>
                <div className="relative">
                  <input type="number" className="input-field text-xs w-full pr-7" min={1} max={53} value={semana} onChange={(e) => setSemana(e.target.value === '' ? '' : Number(e.target.value))} placeholder="1 – 53" />
                  {semana !== '' && semana !== defaults.semana && (
                    <button onClick={() => setSemana(defaults.semana)} className="absolute right-2 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Año</label>
                <div className="relative">
                  <input type="number" className="input-field text-xs w-full pr-7" min={2020} max={2035} value={anio} onChange={(e) => setAnio(e.target.value === '' ? '' : Number(e.target.value))} placeholder="2026" />
                  {anio !== '' && anio !== defaults.anio && (
                    <button onClick={() => setAnio(defaults.anio)} className="absolute right-2 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border w-fit mb-6">
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

      {/* Contenido */}
      {tab === 'diario' ? (
        <ConsolidadoDiario {...filters} />
      ) : (
        <ConsolidadoSemanal {...filters} />
      )}
    </div>
  );
}
