'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { X, Plus } from 'lucide-react';
import { ConfirmModal } from '@/app/components/ConfirmModal';

interface Finca { id: string; nombre: string; ubicacion?: string; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-overlay">
      <div className="bg-surface-raised border border-surface-border rounded-xl w-full max-w-md mx-4 shadow-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="text-carbon-400 hover:text-carbon-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function FincasPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Finca | null>(null);
  const [form, setForm] = useState({ nombre: '', ubicacion: '' });
  const [confirmDelete, setConfirmDelete] = useState<Finca | null>(null);

  const { data: fincas = [], isLoading } = useQuery<Finca[]>({
    queryKey: ['fincas'],
    queryFn: () => api.get('/fincas').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: typeof form) =>
      editing
        ? api.patch(`/fincas/${editing.id}`, data)
        : api.post('/fincas', data),
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: ['fincas'] });
      toast.success(editing ? `Finca "${data.nombre}" actualizada` : `Finca "${data.nombre}" creada`);
      closeModal();
    },
    onError: () => toast.error('Error al guardar'),
  });

  const remove = useMutation({
    mutationFn: ({ id }: { id: string; nombre: string }) => api.delete(`/fincas/${id}`),
    onSuccess: (_, { nombre }) => {
      qc.invalidateQueries({ queryKey: ['fincas'] });
      toast.success(`Finca "${nombre}" eliminada`);
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  function openCreate() { setEditing(null); setForm({ nombre: '', ubicacion: '' }); setModal('create'); }
  function openEdit(f: Finca) { setEditing(f); setForm({ nombre: f.nombre, ubicacion: f.ubicacion ?? '' }); setModal('edit'); }
  function closeModal() { setModal(null); setEditing(null); }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Fincas</h1>
          <p className="text-carbon-400 text-sm mt-1">Gestiona las fincas registradas en el sistema</p>
        </div>
        <button id="btn-crear-finca" onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nueva finca
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-verde-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-surface-overlay">
                <th className="table-th px-6 py-3">Nombre</th>
                <th className="table-th px-6 py-3">Ubicación</th>
                <th className="table-th px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {fincas.length === 0 && (
                <tr><td colSpan={3} className="empty-state">Sin fincas registradas</td></tr>
              )}
              {fincas.map((f, i) => (
                <tr key={f.id} className={`table-row-hover border-b border-surface-border/40 ${i % 2 === 0 ? '' : 'bg-surface-overlay'}`}>
                  <td className="px-6 py-3.5 font-medium text-carbon-50">{f.nombre}</td>
                  <td className="px-6 py-3.5 text-carbon-400 text-xs">{f.ubicacion ?? '—'}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/fincas/${f.id}`} className="btn-ghost text-xs py-1 px-3">Ver detalle</Link>
                      <button onClick={() => openEdit(f)} className="btn-ghost text-xs py-1 px-3">Editar</button>
                      <button onClick={() => setConfirmDelete(f)} className="btn-danger text-xs py-1 px-3">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal === 'create' ? 'Nueva finca' : 'Editar finca'} onClose={closeModal}>
          <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="space-y-4">
            <div>
              <label className="form-label">Nombre <span className="text-red-500 ml-0.5">*</span></label>
              <input className="input-field" required value={form.nombre}
                onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value.toUpperCase() }))}
                onInput={(e) => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }}
              />
            </div>
            <div>
              <label className="form-label">Ubicación</label>
              <input className="input-field" value={form.ubicacion}
                onChange={(e) => setForm(p => ({ ...p, ubicacion: e.target.value }))}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={closeModal} className="btn-ghost flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={save.isPending} className="btn-primary flex-1 justify-center">
                {save.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar la finca "${confirmDelete.nombre}"?`}
          onConfirm={() => remove.mutate({ id: confirmDelete.id, nombre: confirmDelete.nombre })}
          onCancel={() => setConfirmDelete(null)}
          isPending={remove.isPending}
        />
      )}
    </div>
  );
}
