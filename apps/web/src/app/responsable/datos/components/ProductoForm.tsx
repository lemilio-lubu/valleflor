'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Producto { id: string; nombre: string; }

interface Props { fincaId?: string; }

export function ProductoForm({ fincaId }: Props) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Producto | null>(null);
  const [nombre, setNombre] = useState('');
  const [open, setOpen] = useState(false);

  const { data: productos = [] } = useQuery<Producto[]>({
    queryKey: ['productos', fincaId],
    queryFn: () => api.get('/productos', { params: { fincaId } }).then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: { nombre: string; fincaId?: string }) =>
      editing
        ? api.patch(`/productos/${editing.id}`, { nombre: data.nombre })
        : api.post('/productos', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['productos'] });
      toast.success(editing ? 'Producto actualizado' : 'Producto creado');
      reset();
    },
    onError: () => toast.error('Error al guardar'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/productos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['productos'] }); toast.success('Eliminado'); },
    onError: () => toast.error('No se puede eliminar'),
  });

  function reset() { setEditing(null); setNombre(''); setOpen(false); }
  function startEdit(p: Producto) { setEditing(p); setNombre(p.nombre); setOpen(true); }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-carbon-200 uppercase tracking-widest font-mono">Productos</h3>
        <button
          id="btn-nuevo-producto"
          onClick={() => { reset(); setOpen(true); }}
          className="btn-ghost text-xs py-1.5"
        >+ Nuevo</button>
      </div>

      {open && (
        <form
          onSubmit={(e) => { e.preventDefault(); save.mutate({ nombre, fincaId }); }}
          className="mb-4 flex gap-2"
        >
          <input
            className="input-field text-sm"
            required
            placeholder="Nombre del producto"
            value={nombre}
            onInput={(e) => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }}
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
            {productos.length === 0 && (
              <tr><td className="text-center py-6 text-carbon-400 font-mono text-xs">Sin productos</td></tr>
            )}
            {productos.map((p) => (
              <tr key={p.id} className="table-row-hover border-b border-surface-border/30">
                <td className="px-4 py-2.5 font-mono text-xs text-carbon-200">{p.nombre}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => startEdit(p)} className="text-carbon-400 hover:text-verde-400 text-xs mr-3 transition-colors">editar</button>
                  <button onClick={() => { if (confirm('¿Eliminar?')) remove.mutate(p.id); }} className="text-carbon-400 hover:text-red-400 text-xs transition-colors">eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
