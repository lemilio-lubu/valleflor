'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { ConfirmModal } from '@/app/components/ConfirmModal';

interface Producto { id: string; nombre: string; }

export function ProductoForm({ fincaId }: { fincaId: string }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Producto | null>(null);
  const [nombre, setNombre] = useState('');
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Producto | null>(null);

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['productos', fincaId],
    queryFn: () => api.get('/productos', { params: { fincaId } }).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: { nombre: string; fincaId?: string }) =>
      editing
        ? api.patch(`/productos/${editing.id}`, { nombre: data.nombre })
        : api.post('/productos', data),
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: ['productos', fincaId] });
      toast.success(editing ? `Producto "${data.nombre}" actualizado` : `Producto "${data.nombre}" creado`);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar'),
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: string; nombre: string }) => api.delete(`/productos/${id}`),
    onSuccess: (_, { nombre }) => {
      qc.invalidateQueries({ queryKey: ['productos', fincaId] });
      toast.success(`Producto "${nombre}" eliminado`);
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  function reset() { setEditing(null); setNombre(''); setOpen(false); }
  function startEdit(p: Producto) { setEditing(p); setNombre(p.nombre); setOpen(true); }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="card-section-title">Productos</h3>
        <button onClick={() => { reset(); setOpen(true); }} className="btn-ghost text-xs py-1.5">+ Nuevo</button>
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); save.mutate({ nombre, fincaId }); }} className="mb-4 flex gap-2">
          <input
            className="input-field text-sm"
            required
            placeholder="Nombre del producto"
            value={nombre}
            onChange={(e) => setNombre(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={save.isPending} className="btn-primary whitespace-nowrap text-xs">
            {save.isPending ? '...' : editing ? 'Actualizar' : 'Crear'}
          </button>
          <button type="button" onClick={reset} className="btn-ghost text-xs">✕</button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-surface-border">
        <table className="w-full text-sm">
          <tbody>
            {productos.length === 0 && <tr><td className="empty-state py-6">Sin productos</td></tr>}
            {productos.map((p) => (
              <tr key={p.id} className="table-row-hover border-b border-surface-border/30">
                <td className="px-4 py-2.5 text-sm text-carbon-50">{p.nombre}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => startEdit(p)} className="text-carbon-300 hover:text-verde-600 text-xs mr-3 transition-colors">Editar</button>
                  <button onClick={() => setConfirmDelete(p)} className="text-carbon-300 hover:text-red-600 text-xs transition-colors">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar el producto "${confirmDelete.nombre}"?`}
          onConfirm={() => remove.mutate(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          isPending={remove.isPending}
        />
      )}
    </div>
  );
}
