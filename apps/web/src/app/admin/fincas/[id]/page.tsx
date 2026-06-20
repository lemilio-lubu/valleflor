'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ChevronDown, Minus, Search, X, UserPlus, Check, UserMinus, Settings2 } from 'lucide-react';
import { ConfirmModal } from '@/app/components/ConfirmModal';

interface Responsable { id: string; userId: string; user?: { email: string; nombre?: string }; }
interface Finca { id: string; nombre: string; ubicacion?: string; responsables?: Responsable[]; }
interface Usuario { id: string; email: string; role: string; nombre?: string; }

function AsignarModal({ onClose, onConfirm, isPending }: {
  onClose: () => void; onConfirm: (userId: string) => void; isPending: boolean;
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
          <button onClick={onClose} className="text-carbon-400 hover:text-carbon-50 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-carbon-400" />
            <input type="text" placeholder="Buscar por nombre o email..." className="input-field pl-9" value={search}
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

interface ColorTree {
  id: string;
  nombre: string;
  codigo: string;
  nombreComercial: string | null;
  variedad: { id: string; nombre: string; producto: { id: string; nombre: string } };
}
type TriState = 'none' | 'some' | 'all';

// Casilla tri-estado reutilizable
function TriCheckbox({ state }: { state: TriState }) {
  const active = state !== 'none';
  return (
    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${active ? 'bg-verde-600 border-verde-600' : 'border-carbon-400'}`}>
      {state === 'all' && <Check className="w-2.5 h-2.5 text-white" />}
      {state === 'some' && <Minus className="w-2.5 h-2.5 text-white" />}
    </span>
  );
}

function AsignarProductosModal({ fincaId, responsableId, responsableNombre, onClose }: {
  fincaId: string; responsableId: string; responsableNombre: string; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [expandedProd, setExpandedProd] = useState<Set<string>>(new Set());
  const [expandedVar, setExpandedVar] = useState<Set<string>>(new Set());

  const { data: colores = [], isLoading: loadingColores } = useQuery<ColorTree[]>({
    queryKey: ['catalogo-arbol'],
    queryFn: () => api.get('/colores').then((r) => r.data),
  });

  const { data: coloresAsignados = [], isLoading: loadingAsignados } = useQuery<string[]>({
    queryKey: ['responsable-colores', fincaId, responsableId],
    queryFn: () => api.get(`/fincas/${fincaId}/responsables/${responsableId}/colores`).then((r) => r.data),
  });

  const currentSelected = selected ?? new Set(coloresAsignados);

  // Agrupar colores en árbol producto → variedad → color
  const arbol = useMemo(() => {
    const prodMap = new Map<string, {
      producto: { id: string; nombre: string };
      variedades: Map<string, { variedad: { id: string; nombre: string }; colores: ColorTree[] }>;
    }>();
    for (const c of colores) {
      const p = c.variedad?.producto;
      const v = c.variedad;
      if (!p || !v) continue;
      if (!prodMap.has(p.id)) prodMap.set(p.id, { producto: p, variedades: new Map() });
      const pe = prodMap.get(p.id)!;
      if (!pe.variedades.has(v.id)) pe.variedades.set(v.id, { variedad: { id: v.id, nombre: v.nombre }, colores: [] });
      pe.variedades.get(v.id)!.colores.push(c);
    }
    return prodMap;
  }, [colores]);

  function triState(ids: string[]): TriState {
    if (ids.length === 0) return 'none';
    const sel = ids.filter((id) => currentSelected.has(id)).length;
    return sel === 0 ? 'none' : sel === ids.length ? 'all' : 'some';
  }

  function setMany(ids: string[], value: boolean) {
    const next = new Set(currentSelected);
    for (const id of ids) value ? next.add(id) : next.delete(id);
    setSelected(next);
  }

  function toggleColor(id: string) {
    const next = new Set(currentSelected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const toggleExpand = (set: Set<string>, setter: (s: Set<string>) => void, id: string) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const save = useMutation({
    mutationFn: () => api.post(`/fincas/${fincaId}/responsables/${responsableId}/productos`, { colorIds: [...currentSelected] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['responsable-colores', fincaId, responsableId] });
      qc.invalidateQueries({ queryKey: ['responsable-productos', fincaId, responsableId] });
      toast.success('Asignaciones guardadas');
      onClose();
    },
    onError: () => toast.error('Error al guardar asignaciones'),
  });

  const isLoading = loadingColores || loadingAsignados;

  return (
    <div className="modal-overlay">
      <div className="bg-surface-raised border border-surface-border rounded-xl w-full max-w-lg mx-4 shadow-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h3 className="modal-title">Asignar productos, variedades y colores</h3>
            <p className="text-xs text-carbon-400 mt-0.5">{responsableNombre}</p>
          </div>
          <button onClick={onClose} className="text-carbon-400 hover:text-carbon-50 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">
          {isLoading && <div className="py-8 text-center text-carbon-400 text-sm">Cargando...</div>}
          {!isLoading && arbol.size === 0 && (
            <div className="empty-state py-8">Sin colores en el catálogo. Agrégalos desde el catálogo.</div>
          )}
          {!isLoading && arbol.size > 0 && (
            <div className="mb-6 max-h-80 overflow-y-auto rounded-lg border border-surface-border divide-y divide-surface-border/50">
              {[...arbol.values()].map(({ producto, variedades }) => {
                const prodColorIds = [...variedades.values()].flatMap((v) => v.colores.map((c) => c.id));
                const prodState = triState(prodColorIds);
                const prodOpen = expandedProd.has(producto.id);
                return (
                  <div key={producto.id}>
                    {/* Producto */}
                    <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-surface-overlay">
                      <button type="button" onClick={() => toggleExpand(expandedProd, setExpandedProd, producto.id)}
                        className="text-carbon-400 hover:text-carbon-50 flex-shrink-0" aria-label="Expandir">
                        {prodOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <button type="button" onClick={() => setMany(prodColorIds, prodState !== 'all')}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left">
                        <TriCheckbox state={prodState} />
                        <span className="text-sm font-medium text-carbon-50 truncate">{producto.nombre}</span>
                      </button>
                    </div>

                    {/* Variedades */}
                    {prodOpen && [...variedades.values()].map(({ variedad, colores: cols }) => {
                      const varColorIds = cols.map((c) => c.id);
                      const varState = triState(varColorIds);
                      const varOpen = expandedVar.has(variedad.id);
                      return (
                        <div key={variedad.id}>
                          <div className="flex items-center gap-2 pl-8 pr-3 py-2 hover:bg-surface-overlay">
                            <button type="button" onClick={() => toggleExpand(expandedVar, setExpandedVar, variedad.id)}
                              className="text-carbon-400 hover:text-carbon-50 flex-shrink-0" aria-label="Expandir">
                              {varOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <button type="button" onClick={() => setMany(varColorIds, varState !== 'all')}
                              className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              <TriCheckbox state={varState} />
                              <span className="text-sm text-carbon-200 truncate">{variedad.nombre}</span>
                            </button>
                          </div>

                          {/* Colores */}
                          {varOpen && cols.map((c) => {
                            const checked = currentSelected.has(c.id);
                            return (
                              <button key={c.id} type="button" onClick={() => toggleColor(c.id)}
                                className={`w-full flex items-center gap-2 pl-[60px] pr-3 py-1.5 text-left transition-colors ${checked ? 'bg-verde-50' : 'hover:bg-surface-overlay'}`}>
                                <TriCheckbox state={checked ? 'all' : 'none'} />
                                <span className={`text-sm truncate ${checked ? 'text-verde-700' : 'text-carbon-300'}`}>
                                  {c.nombre}
                                  <span className="text-[11px] text-carbon-400"> · {c.codigo}{c.nombreComercial ? ` · ${c.nombreComercial}` : ''}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
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
  const qc = useQueryClient();
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
    onSuccess: async (_, { nombre }) => {
      await refetch();
      qc.invalidateQueries({ queryKey: ['consolidado-diario'] });
      qc.invalidateQueries({ queryKey: ['consolidado-semanal'] });
      qc.invalidateQueries({ queryKey: ['base-semanal'] });
      toast.success(`Responsable "${nombre}" removido`);
      setConfirmRemove(null);
    },
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

      <div className="card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <h2 className="card-section-title">Responsables asignados</h2>
            <button
              onClick={() => setShowModal(true)}
              className="btn-ghost text-xs py-1.5 w-full sm:w-auto shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" /> Asignar responsable
            </button>
          </div>
          <div className="-mx-phi-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
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
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          <button onClick={() => setAsignarProductos({ responsableId: r.id, nombre })}
                            className="text-carbon-400 hover:text-verde-600 transition-colors flex items-center gap-1 text-xs">
                            <Settings2 className="w-3.5 h-3.5" /> Productos
                          </button>
                          <button onClick={() => setConfirmRemove({ responsableId: r.id, nombre })}
                            className="text-carbon-400 hover:text-red-600 transition-colors" title="Quitar responsable">
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      {showModal && <AsignarModal onClose={() => setShowModal(false)} onConfirm={(userId) => assign.mutate(userId)} isPending={assign.isPending} />}
      {confirmRemove && (
        <ConfirmModal message={`¿Quitar a "${confirmRemove.nombre}" de esta finca?`}
          onConfirm={() => removeResp.mutate(confirmRemove)} onCancel={() => setConfirmRemove(null)}
          confirmLabel="Quitar" isPending={removeResp.isPending} />
      )}
      {asignarProductos && id && (
        <AsignarProductosModal fincaId={id} responsableId={asignarProductos.responsableId}
          responsableNombre={asignarProductos.nombre} onClose={() => setAsignarProductos(null)} />
      )}
    </div>
  );
}
