'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/app/components/ConfirmModal';

interface Producto { id: string; nombre: string; }
interface Variedad { id: string; nombre: string; productoId: string; }
interface Color { id: string; nombre: string; variedadId: string; }

export function ColorForm({ fincaId }: { fincaId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Color | null>(null);
  const [nombre, setNombre] = useState('');
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [selectedVariedadId, setSelectedVariedadId] = useState('');
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Color | null>(null);

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['productos', fincaId],
    queryFn: () => api.get('/productos', { params: { fincaId } }).then((r) => r.data),
  });

  const { data: variedades = [] } = useQuery<Variedad[]>({
    queryKey: ['variedades', selectedProductoId],
    queryFn: () => api.get('/variedades', { params: { productoId: selectedProductoId } }).then((r) => r.data),
    enabled: !!selectedProductoId,
  });

  const { data: colores = [] } = useQuery<Color[]>({
    queryKey: ['colores', selectedVariedadId],
    queryFn: () => api.get('/colores', { params: { variedadId: selectedVariedadId } }).then((r) => r.data),
    enabled: !!selectedVariedadId,
  });

  const save = useMutation({
    mutationFn: (data: { nombre: string; variedadId: string }) =>
      editing
        ? api.patch(`/colores/${editing.id}`, { nombre: data.nombre })
        : api.post('/colores', data),
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: ['colores', selectedVariedadId] });
      toast.success(editing ? `Color "${data.nombre}" actualizado` : `Color "${data.nombre}" creado`);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar'),
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: string; nombre: string }) => api.delete(`/colores/${id}`),
    onSuccess: (_, { nombre }) => {
      qc.invalidateQueries({ queryKey: ['colores', selectedVariedadId] });
      toast.success(`Color "${nombre}" eliminado`);
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  function reset() { setEditing(null); setNombre(''); setOpen(false); }
  function startEdit(c: Color) { setEditing(c); setNombre(c.nombre); setSelectedVariedadId(c.variedadId); setOpen(true); }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="card-section-title">Colores</h3>
        <button onClick={() => { reset(); setOpen(true); }} className="btn-ghost text-xs py-1.5">+ Nuevo</button>
      </div>

      <div className="flex gap-2 mb-3">
        <select className="input-field text-xs flex-1" value={selectedProductoId}
          onChange={(e) => { setSelectedProductoId(e.target.value); setSelectedVariedadId(''); }}>
          <option value="">— Producto —</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <select className="input-field text-xs flex-1" value={selectedVariedadId}
          onChange={(e) => setSelectedVariedadId(e.target.value)} disabled={!selectedProductoId}>
          <option value="">— Variedad —</option>
          {variedades.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate({ nombre, variedadId: selectedVariedadId }); }} className="mb-4 flex gap-2">
          <input
            className="input-field text-sm"
            required
            placeholder="Nombre del color"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={save.isPending || !selectedVariedadId} className="btn-primary whitespace-nowrap text-xs">
            {save.isPending ? '...' : editing ? 'Actualizar' : 'Crear'}
          </button>
          <button type="button" onClick={reset} className="btn-ghost text-xs">✕</button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-surface-border">
        <table className="w-full text-sm">
          <tbody>
            {!selectedVariedadId && <tr><td className="empty-state py-6">Selecciona producto → variedad</td></tr>}
            {selectedVariedadId && colores.length === 0 && <tr><td className="empty-state py-6">Sin colores</td></tr>}
            {colores.map((c) => (
              <tr key={c.id} className="table-row-hover border-b border-surface-border/30">
                <td className="px-4 py-2.5 text-sm text-carbon-50">{c.nombre}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => startEdit(c)} className="text-carbon-300 hover:text-verde-600 text-xs mr-3 transition-colors">Editar</button>
                  <button onClick={() => setConfirmDelete(c)} className="text-carbon-300 hover:text-red-600 text-xs transition-colors">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar el color "${confirmDelete.nombre}"?`}
          onConfirm={() => remove.mutate(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          isPending={remove.isPending}
        />
      )}
    </div>
  );
}
