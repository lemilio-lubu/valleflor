'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search, X, UserPlus, Check, UserMinus } from 'lucide-react';

interface Responsable { id: string; nombre: string; userId: string; user?: { email: string }; }
interface Finca { id: string; nombre: string; ubicacion?: string; responsables?: Responsable[]; }
interface Usuario { id: string; email: string; role: string; responsable?: { nombre: string }; }

/* ── Modal: solo selecciona usuario y nombre, llama onConfirm ── */
function AsignarModal({
  onClose,
  onConfirm,
  isPending,
}: {
  onClose: () => void;
  onConfirm: (userId: string, nombre: string) => void;
  isPending: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Usuario | null>(null);
  const [nombre, setNombre] = useState('');

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return usuarios.filter((u) =>
      u.role === 'responsable' &&
      (!q || u.email.toLowerCase().includes(q) || u.responsable?.nombre.toLowerCase().includes(q))
    );
  }, [usuarios, search]);

  function handleSelect(u: Usuario) {
    setSelected(u);
    setNombre(u.responsable?.nombre ?? u.email.split('@')[0].toUpperCase().replace(/\./g, ' '));
  }

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
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              className="input-field pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
              autoFocus
            />
          </div>

          <div className="max-h-52 overflow-y-auto rounded-lg border border-surface-border divide-y divide-surface-border/50">
            {isLoading && <div className="py-8 text-center text-carbon-400 text-sm">Cargando...</div>}
            {!isLoading && filtered.length === 0 && <div className="py-8 text-center text-carbon-400 text-sm">Sin resultados</div>}
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleSelect(u)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                  selected?.id === u.id ? 'bg-verde-50' : 'hover:bg-surface-overlay'
                }`}
              >
                <div>
                  <p className={`text-sm font-medium ${selected?.id === u.id ? 'text-verde-600' : 'text-carbon-50'}`}>
                    {u.responsable?.nombre ?? u.email.split('@')[0].toUpperCase().replace(/\./g, ' ')}
                  </p>
                  <p className={`text-xs font-mono ${selected?.id === u.id ? 'text-verde-500' : 'text-carbon-400'}`}>
                    {u.email}
                  </p>
                </div>
                {selected?.id === u.id && <Check className="w-4 h-4 text-verde-600 flex-shrink-0" />}
              </button>
            ))}
          </div>

          {selected && (
            <div className="animate-fade-in">
              <label className="form-label">Nombre del responsable</label>
              <input
                className="input-field"
                value={nombre}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
                placeholder="Ej: ANDRES PEREZ"
              />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!selected || !nombre.trim() || isPending}
              onClick={() => onConfirm(selected!.id, nombre.trim())}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Asignando...' : 'Asignar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ── */
export default function FincaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  const { data: finca, isLoading, refetch } = useQuery<Finca>({
    queryKey: ['finca', id],
    queryFn: () => api.get(`/fincas/${id}`).then((r) => r.data),
    enabled: !!id,
    staleTime: 0,
  });

  const assign = useMutation({
    mutationFn: ({ userId, nombre }: { userId: string; nombre: string }) =>
      api.post(`/fincas/${id}/responsables`, { userId, nombre }),
    onSuccess: async () => {
      setShowModal(false);
      await refetch();
      toast.success('Responsable asignado');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al asignar responsable'),
  });

  const removeResp = useMutation({
    mutationFn: (responsableId: string) =>
      api.delete(`/fincas/${id}/responsables/${responsableId}`),
    onSuccess: async () => {
      await refetch();
      toast.success('Responsable removido');
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
        <div className="flex items-center justify-between mb-5">
          <h2 className="card-section-title">Responsables</h2>
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
            {finca?.responsables?.map((r) => (
              <tr key={r.id} className="table-row-hover border-b border-surface-border/30">
                <td className="py-3 px-3 font-medium text-carbon-50">{r.nombre}</td>
                <td className="py-3 px-3 text-carbon-400 font-mono text-xs">{r.user?.email ?? '—'}</td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => { if (confirm(`¿Quitar a ${r.nombre} de esta finca?`)) removeResp.mutate(r.id); }}
                    className="text-carbon-400 hover:text-red-600 transition-colors"
                    title="Quitar responsable"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <AsignarModal
          onClose={() => setShowModal(false)}
          onConfirm={(userId, nombre) => assign.mutate({ userId, nombre })}
          isPending={assign.isPending}
        />
      )}
    </div>
  );
}
