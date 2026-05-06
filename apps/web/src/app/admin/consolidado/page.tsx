'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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
      <div className="flex items-center gap-3 mb-6">
        <BarChart2 className="w-6 h-6 text-verde-500" />
        <div>
          <h1 className="section-title">Consolidado</h1>
          <p className="text-carbon-400 text-sm mt-0.5">
            Vista consolidada de estimados diarios y semanales por finca, responsable y semana
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-5 mb-6">
        <p className="text-xs font-semibold text-carbon-400 uppercase tracking-wider mb-3">
          Filtros
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="form-label">Finca</label>
            <select
              className="input-field text-sm"
              value={fincaId}
              onChange={(e) => handleFincaChange(e.target.value)}
            >
              <option value="">— Todas —</option>
              {fincas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Responsable</label>
            <select
              className="input-field text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              value={responsableId}
              onChange={(e) => setResponsableId(e.target.value)}
              disabled={!fincaId}
            >
              <option value="">— Todos —</option>
              {responsables.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.user.nombre || r.user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Semana</label>
            <input
              type="number"
              className="input-field text-sm"
              min={1}
              max={53}
              value={semana}
              onChange={(e) =>
                setSemana(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="1 – 53"
            />
          </div>

          <div>
            <label className="form-label">Año</label>
            <input
              type="number"
              className="input-field text-sm"
              min={2020}
              max={2035}
              value={anio}
              onChange={(e) =>
                setAnio(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="2026"
            />
          </div>
        </div>

        <button onClick={handleReset} className="btn-ghost text-xs py-1.5 px-3 mt-4">
          Restablecer filtros
        </button>
      </div>

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
