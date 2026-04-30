'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Producto { id: string; nombre: string; }
interface Variedad { id: string; nombre: string; productoId: string; producto?: Producto; }

interface Props { productoId?: string; fincaId?: string; }

export function VariedadForm({ productoId, fincaId }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Variedad | null>(null);
  const [nombre, setNombre] = useState('');
  const [selectedProductoId, setSelectedProductoId] = useState(productoId ?? '');
  const [open, setOpen] = useState(false);

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['productos', fincaId],
    queryFn: () => fincaId ? api.get('/productos', { params: { fincaId } }).then((r) => r.data) : Promise.resolve([]),
    enabled: !!fincaId,
  });

  const { data: variedades = [] } = useQuery<Variedad[]>({
    queryKey: ['variedades', selectedProductoId],
    queryFn: () =>
      selectedProductoId
        ? api.get('/variedades', { params: { productoId: selectedProductoId } }).then((r) => r.data)
        : Promise.resolve([]),
    enabled: !!selectedProductoId,
  });

  const save = useMutation({
    mutationFn: (data: { nombre: string; productoId: string }) =>
      editing
        ? api.patch(`/variedades/${editing.id}`, { nombre: data.nombre })
        : api.post('/variedades', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['variedades'] });
      toast.success(editing ? 'Variedad actualizada' : 'Variedad creada');
      reset();
    },
    onError: () => toast.error('Error al guardar'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/variedades/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['variedades'] }); toast.success('Eliminado'); },
    onError: () => toast.error('No se puede eliminar'),
  });

  function reset() { setEditing(null); setNombre(''); setOpen(false); }
  function startEdit(v: Variedad) { setEditing(v); setNombre(v.nombre); setSelectedProductoId(v.productoId); setOpen(true); }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="card-section-title">Variedades</h3>
        <button id="btn-nueva-variedad" onClick={() => { reset(); setOpen(true); }} className="btn-ghost text-xs py-1.5">+ Nueva</button>
      </div>

      {/* Filtro por producto */}
      <div className="mb-3">
        <select
          className="input-field text-xs"
          value={selectedProductoId}
          onChange={(e) => setSelectedProductoId(e.target.value)}
        >
          <option value="">— Seleccionar producto —</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </div>

      {open && (
        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate({ nombre, productoId: selectedProductoId }); }}
          className="mb-4 flex gap-2"
        >
          <input
            className="input-field text-sm"
            required
            placeholder="Nombre de la variedad"
            value={nombre}
            onInput={(e) => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }}
            onChange={(e) => setNombre(e.target.value.toUpperCase())}
          />
          <button type="submit" disabled={save.isPending || !selectedProductoId} className="btn-primary whitespace-nowrap text-xs">
            {save.isPending ? '...' : editing ? 'Actualizar' : 'Crear'}
          </button>
          <button type="button" onClick={reset} className="btn-ghost text-xs">✕</button>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border border-surface-border">
        <table className="w-full text-sm">
          <tbody>
            {!selectedProductoId && (
              <tr><td className="empty-state py-6">Selecciona un producto</td></tr>
            )}
            {selectedProductoId && variedades.length === 0 && (
              <tr><td className="empty-state py-6">Sin variedades</td></tr>
            )}
            {variedades.map((v) => (
              <tr key={v.id} className="table-row-hover border-b border-surface-border/30">
                <td className="px-4 py-2.5 text-sm text-carbon-50">{v.nombre}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => startEdit(v)} className="text-carbon-300 hover:text-verde-600 text-xs mr-3 transition-colors">editar</button>
                  <button onClick={() => { if (confirm('¿Eliminar?')) remove.mutate(v.id); }} className="text-carbon-300 hover:text-red-600 text-xs transition-colors">eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
