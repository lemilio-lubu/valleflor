'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, X, UserPlus, Check, UserMinus, Settings2 } from 'lucide-react';
import { ConfirmModal } from '@/app/components/ConfirmModal';
import { CatalogoProductos } from './components/CatalogoProductos';

interface Responsable { id: string; userId: string; user?: { email: string; nombre?: string }; }
interface Finca { id: string; nombre: string; ubicacion?: string; responsables?: Responsable[]; }
interface Usuario { id: string; email: string; role: string; nombre?: string; }

type Tab = 'responsables' | 'productos';

function AsignarModal({ onClose, onConfirm, isPending }: {
  onClose: () => void;
  onConfirm: (userId: string) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Usuario | null>(null);

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return usuarios.filter((u) =>
      u.role === 'responsable' &&
      (!q || u.email.toLowerCase().includes(q) || (u.nombre ?? '').toLowerCase().includes(q))
    );
  }, [usuarios, search]);

  return (
    <div className="modal-overlay">
      <div className="bg-surface-raised border border-surface-border rounded-xl w-full max-w-md mx-4 shadow-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h3 className="modal-title">Asignar responsable</h3>
          <button onClick={onClose} className="text-carbon-400 hover:text-carbon-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-carbon-400" />
            <input type="text" placeholder="Buscar por nombre o email..."
              className="input-field pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }} autoFocus />
          </div>
          <div className="max-h-60 overflow-y-auto rounded-lg border border-surface-border divide-y divide-surface-border/50">
            {isLoading && <div className="py-8 text-center text-carbon-400 text-sm">Cargando...</div>}
            {!isLoading && filtered.length === 0 && <div className="py-8 text-center text-carbon-400 text-sm">Sin resultados</div>}
            {filtered.map((u) => (
              <button key={u.id} type="button" onClick={() => setSelected(u)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${selected?.id === u.id ? 'bg-verde-50' : 'hover:bg-surface-overlay'}`}>
                <div>
                  <p className={`text-sm font-medium ${selected?.id === u.id ? 'text-verde-600' : 'text-carbon-50'}`}>
                    {u.nombre ?? u.email.split('@')[0].toUpperCase().replace(/\./g, ' ')}
                  </p>
                  <p className={`text-xs font-mono ${selected?.id === u.id ? 'text-verde-500' : 'text-carbon-400'}`}>{u.email}</p>
                </div>
                {selected?.id === u.id && <Check className="w-4 h-4 text-verde-600 flex-shrink-0" />}
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="button" disabled={!selected || isPending} onClick={() => onConfirm(selected!.id)}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {isPending ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AsignarProductosModal({ fincaId, responsableId, responsableNombre, onClose }: {
  fincaId: string;
  responsableId: string;
  responsableNombre: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();

  const { data: productosDisponibles = [], isLoading: loadingProductos } = useQuery<Producto[]>({
    queryKey: ['productos', fincaId],
    queryFn: () => api.get('/productos', { params: { fincaId } }).then((r) => r.data),
  });

  const { data: productosAsignados = [], isLoading: loadingAsignados } = useQuery<Producto[]>({
    queryKey: ['responsable-productos', fincaId, responsableId],
    queryFn: () => api.get(`/fincas/${fincaId}/responsables/${responsableId}/productos`).then((r) => r.data),
  });

  const [selected, setSelected] = useState<Set<string> | null>(null);

  const currentSelected = selected ?? new Set(productosAsignados.map((p) => p.id));

  const toggle = (id: string) => {
    const next = new Set(currentSelected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const save = useMutation({
    mutationFn: () => api.post(`/fincas/${fincaId}/responsables/${responsableId}/productos`, {
      productoIds: [...currentSelected],
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsable-productos', fincaId, responsableId] });
      toast.success('Productos asignados');
      onClose();
    },
    onError: () => toast.error('Error al asignar productos'),
  });

  const isLoading = loadingProductos || loadingAsignados;

  return (
    <div className="modal-overlay">
      <div className="bg-surface-raised border border-surface-border rounded-xl w-full max-w-md mx-4 shadow-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h3 className="modal-title">Productos asignados</h3>
            <p className="text-xs text-carbon-400 mt-0.5">{responsableNombre}</p>
          </div>
          <button onClick={onClose} className="text-carbon-400 hover:text-carbon-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {isLoading && <div className="py-8 text-center text-carbon-400 text-sm">Cargando...</div>}
          {!isLoading && productosDisponibles.length === 0 && (
            <div className="empty-state py-8">Sin productos registrados en esta finca</div>
          )}
          {!isLoading && productosDisponibles.length > 0 && (
            <div className="space-y-1 mb-6 max-h-72 overflow-y-auto">
              {productosDisponibles.map((p) => {
                const checked = currentSelected.has(p.id);
                return (
                  <button key={p.id} type="button" onClick={() => toggle(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors ${checked ? 'bg-verde-50 text-verde-700' : 'hover:bg-surface-overlay text-carbon-50'}`}>
                    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-verde-600 border-verde-600' : 'border-carbon-400'}`}>
                      {checked && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span className="text-sm font-medium">{p.nombre}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="button" onClick={() => save.mutate()} disabled={save.isPending || isLoading}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FincaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>('responsables');
  const [showModal, setShowModal] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<{ responsableId: string; nombre: string } | null>(null);
  const [asignarProductos, setAsignarProductos] = useState<{ responsableId: string; nombre: string } | null>(null);

  const { data: finca, isLoading, refetch } = useQuery<Finca>({
    queryKey: ['finca', id],
    queryFn: () => api.get(`/fincas/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 0,
  });

  const assign = useMutation({
    mutationFn: (userId: string) => api.post(`/fincas/${id}/responsables`, { userId }),
    onSuccess: async () => { setShowModal(false); await refetch(); toast.success('Responsable asignado'); },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al asignar responsable'),
  });

  const removeResp = useMutation({
    mutationFn: ({ responsableId }: { responsableId: string; nombre: string }) =>
      api.delete(`/fincas/${id}/responsables/${responsableId}`),
    onSuccess: async (_, { nombre }) => { await refetch(); toast.success(`Responsable "${nombre}" removido`); setConfirmRemove(null); },
    onError: () => toast.error('Error al remover responsable'),
  });

  if (isLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-verde-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/fincas" className="text-carbon-300 hover:text-carbon-50 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="section-title">{finca?.nombre}</h1>
          {finca?.ubicacion && <p className="text-carbon-400 text-sm mt-0.5">{finca.ubicacion}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border mb-6">
        {(['responsables', 'productos'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-verde-600 text-verde-600'
                : 'border-transparent text-carbon-400 hover:text-carbon-50'
            }`}>
            {t === 'responsables' ? 'Responsables' : 'Productos'}
          </button>
        ))}
      </div>

      {/* Tab: Responsables */}
      {tab === 'responsables' && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="card-section-title">Responsables asignados</h2>
            <button onClick={() => setShowModal(true)} className="btn-ghost text-xs py-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              Asignar responsable
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="table-th">Nombre</th>
                <th className="table-th">Email</th>
                <th className="table-th text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(!finca?.responsables || finca.responsables.length === 0) && (
                <tr><td colSpan={3} className="empty-state">Sin responsables asignados</td></tr>
              )}
              {finca?.responsables?.map((r) => {
                const nombre = r.user?.nombre ?? '—';
                return (
                  <tr key={r.id} className="table-row-hover border-b border-surface-border/30">
                    <td className="py-3 px-3 font-medium text-carbon-50">{nombre}</td>
                    <td className="py-3 px-3 text-carbon-400 font-mono text-xs">{r.user?.email ?? '—'}</td>
                    <td className="py-3 px-3 text-right flex items-center justify-end gap-3">
                      <button
                        onClick={() => setAsignarProductos({ responsableId: r.id, nombre })}
                        className="text-carbon-400 hover:text-verde-600 transition-colors flex items-center gap-1 text-xs"
                        title="Asignar productos"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        Productos
                      </button>
                      <button onClick={() => setConfirmRemove({ responsableId: r.id, nombre })}
                        className="text-carbon-400 hover:text-red-600 transition-colors" title="Quitar responsable">
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab: Productos */}
      {tab === 'productos' && id && (
        <div className="card">
          <CatalogoProductos fincaId={id} />
        </div>
      )}

      {showModal && (
        <AsignarModal onClose={() => setShowModal(false)} onConfirm={(userId) => assign.mutate(userId)} isPending={assign.isPending} />
      )}
      {confirmRemove && (
        <ConfirmModal message={`¿Quitar a "${confirmRemove.nombre}" de esta finca?`}
          onConfirm={() => removeResp.mutate(confirmRemove)} onCancel={() => setConfirmRemove(null)}
          confirmLabel="Quitar" isPending={removeResp.isPending} />
      )}
      {asignarProductos && id && (
        <AsignarProductosModal
          fincaId={id}
          responsableId={asignarProductos.responsableId}
          responsableNombre={asignarProductos.nombre}
          onClose={() => setAsignarProductos(null)}
        />
      )}
    </div>
  );
}
