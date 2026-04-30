'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Search } from 'lucide-react';

interface Finca { id: string; nombre: string; }
interface Usuario { id: string; email: string; role: string; createdAt: string; responsable?: { nombre: string; }; }

function CreateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', password: '', role: 'responsable', nombre: '', fincaId: '' });

  const { data: fincas = [] } = useQuery<Finca[]>({
    queryKey: ['fincas'],
    queryFn: () => api.get('/fincas').then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => {
      const payload: Record<string, string> = { email: data.email, password: data.password, role: data.role };
      if (data.role === 'responsable') {
        if (data.nombre) payload.nombre = data.nombre;
        if (data.fincaId) payload.fincaId = data.fincaId;
      }
      return api.post('/users', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuario creado');
      onClose();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message?.[0] ?? err?.response?.data?.message ?? 'Error al crear usuario'),
  });

  return (
    <div className="modal-overlay">
      <div className="bg-surface-raised border border-surface-border rounded-xl w-full max-w-md mx-4 shadow-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h3 className="modal-title">Nuevo usuario</h3>
          <button onClick={onClose} className="text-carbon-400 hover:text-carbon-50 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="p-6 space-y-4">
          <div>
            <label className="form-label">Email</label>
            <input type="email" required className="input-field" value={form.email}
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="usuario@valleflor.com" />
          </div>
          <div>
            <label className="form-label">Contraseña</label>
            <input type="password" required minLength={8} className="input-field" value={form.password}
              onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres" />
          </div>
          <div>
            <label className="form-label">Rol</label>
            <select className="input-field" value={form.role}
              onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="responsable">Responsable</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {form.role === 'responsable' && (
            <div className="space-y-4 pt-3 border-t border-surface-border animate-fade-in">
              <div>
                <label className="form-label">Nombre del responsable</label>
                <input type="text" required className="input-field" value={form.nombre}
                  onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value.toUpperCase() }))}
                  placeholder="Ej: ANDRES PEREZ" />
              </div>
              <div>
                <label className="form-label">Finca asignada</label>
                <select className="input-field" required value={form.fincaId}
                  onChange={(e) => setForm(p => ({ ...p, fincaId: e.target.value }))}>
                  <option value="">Selecciona una finca</option>
                  {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
            </div>
          )}
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

export default function UsuariosPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return usuarios;
    return usuarios.filter((u) =>
      u.email.toLowerCase().includes(q) ||
      (u.responsable?.nombre ?? '').toLowerCase().includes(q)
    );
  }, [usuarios, search]);

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); toast.success('Usuario eliminado'); },
    onError: () => toast.error('No se puede eliminar'),
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Usuarios</h1>
          <p className="text-carbon-400 text-sm mt-1">Cuentas de acceso al sistema</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-carbon-400" />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          className="input-field pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-overlay border-b border-surface-border">
              <th className="table-th">Nombre</th>
              <th className="table-th">Email</th>
              <th className="table-th">Rol</th>
              <th className="table-th">Creado</th>
              <th className="table-th text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              [...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-surface-border/30">
                  <td colSpan={5} className="px-3 py-3"><div className="h-4 bg-surface-overlay rounded animate-pulse" /></td>
                </tr>
              ))
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={5} className="empty-state">{search ? 'Sin resultados' : 'Sin usuarios registrados'}</td></tr>
            )}
            {filtered.map((u) => (
              <tr key={u.id} className="table-row-hover border-b border-surface-border/30">
                <td className="px-3 py-3 font-medium text-carbon-50">
                  {u.responsable?.nombre ?? <span className="text-carbon-400">—</span>}
                </td>
                <td className="px-3 py-3 text-carbon-400 font-mono text-xs">{u.email}</td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center px-phi-1 py-[2px] rounded-sm text-xs font-medium ${
                    u.role === 'admin'
                      ? 'bg-verde-50 text-verde-600 border border-verde-100'
                      : 'bg-surface-overlay text-carbon-400 border border-surface-border'
                  }`}>
                    {u.role === 'admin' ? 'Admin' : 'Responsable'}
                  </span>
                </td>
                <td className="px-3 py-3 text-carbon-400 font-mono text-xs">
                  {new Date(u.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    onClick={() => { if (confirm('¿Eliminar usuario?')) remove.mutate(u.id); }}
                    className="text-carbon-400 hover:text-red-600 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
