'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { SemanaSelector } from './components/SemanaSelector';
import { PlantillaDiaria } from './components/PlantillaDiaria';
import { BaseSemanal } from './components/BaseSemanal';
import { Plus, X, MapPin } from 'lucide-react';

type Tab = 'plantilla' | 'base';

function CreateSemanaModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    numero_semana: '',
    anio: String(new Date().getFullYear()),
    fecha_inicio: '',
    fecha_fin: '',
  });

  const create = useMutation({
    mutationFn: (data: typeof form) =>
      api.post('/semanas', {
        numeroSemana: Number(data.numero_semana),
        anio: Number(data.anio),
        fechaInicio: data.fecha_inicio,
        fechaFin: data.fecha_fin,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['semanas'] });
      toast.success('Semana creada con todos los registros');
      onCreated(res.data.id);
      onClose();
    },
    onError: () => toast.error('Error al crear semana'),
  });

  return (
    <div className="modal-overlay">
      <div className="bg-surface-raised border border-surface-border rounded-xl w-full max-w-sm mx-4 shadow-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h3 className="modal-title">Nueva Semana</h3>
          <button onClick={onClose} className="text-carbon-400 hover:text-carbon-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(form); }}
          className="p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label"># Semana</label>
              <input type="number" min="1" max="53" required className="input-field"
                value={form.numero_semana} onChange={(e) => setForm(p => ({ ...p, numero_semana: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Año</label>
              <input type="number" min="2000" required className="input-field"
                value={form.anio} onChange={(e) => setForm(p => ({ ...p, anio: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="form-label">Fecha inicio</label>
            <input type="date" required className="input-field"
              value={form.fecha_inicio} onChange={(e) => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Fecha fin</label>
            <input type="date" required className="input-field"
              value={form.fecha_fin} onChange={(e) => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={create.isPending} className="btn-primary flex-1 justify-center">
              {create.isPending ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EstimacionesPage() {
  const { data: session } = useSession();
  const fincaId = (session?.user as any)?.fincaId ?? '';
  const fincaNombre = (session?.user as any)?.fincaNombre;
  const responsableNombre = (session?.user as any)?.responsableNombre;

  const [selectedSemana, setSelectedSemana] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('plantilla');
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="max-w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Estimaciones</h1>
          <p className="text-carbon-400 text-sm mt-1">Ingreso de cajas y consulta de base semanal</p>
        </div>
        <button id="btn-nueva-semana" onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nueva semana
        </button>
      </div>

      {fincaNombre && responsableNombre && (
        <div className="bg-surface-overlay border border-dorado-500/20 rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div>
            <p className="text-[10px] font-medium text-dorado-500 uppercase tracking-widest mb-1">Responsable Actual</p>
            <h2 className="text-carbon-50 font-medium text-lg">{responsableNombre}</h2>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-medium text-dorado-500 uppercase tracking-widest mb-1">Finca Asignada</p>
            <div className="flex items-center sm:justify-end gap-2">
              <MapPin className="w-5 h-5 text-verde-600" />
              <h2 className="text-verde-600 font-semibold text-lg">{fincaNombre}</h2>
            </div>
          </div>
        </div>
      )}

      {/* Selector de semanas */}
      <div className="mb-6">
        <p className="text-xs font-medium text-carbon-400 mb-3">Seleccionar semana</p>
        <SemanaSelector
          selectedId={selectedSemana}
          onSelect={setSelectedSemana}
          onDeleted={(id) => { if (selectedSemana === id) setSelectedSemana(null); }}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-border mb-5">
        {([['plantilla', 'Plantilla diaria'], ['base', 'Base semanal']] as const).map(([key, label]) => (
          <button
            key={key}
            id={`tab-${key}`}
            onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 -mb-px ${
              activeTab === key
                ? 'border-verde-600 text-verde-600'
                : 'border-transparent text-carbon-400 hover:text-carbon-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'plantilla' && (
        selectedSemana
          ? <PlantillaDiaria semanaId={selectedSemana} />
          : <div className="empty-state py-16">← Selecciona una semana para ver la plantilla</div>
      )}

      {activeTab === 'base' && (
        fincaId
          ? <BaseSemanal fincaId={fincaId} semanas={10} />
          : <div className="empty-state py-16">No se pudo obtener la finca del responsable</div>
      )}

      {showCreate && (
        <CreateSemanaModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => setSelectedSemana(id)}
        />
      )}
    </div>
  );
}
