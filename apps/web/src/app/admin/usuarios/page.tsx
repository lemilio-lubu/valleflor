'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/app/components/Dialog';
import { ConfirmModal } from '@/app/components/ConfirmModal';
import { Table, Thead, Th, Tbody, Tr, Td, TdEmpty, TrSkeleton } from '@/app/components/Table';

const PAGE_SIZE = 10;

type Usuario = {
  id: string;
  email: string;
  role: 'admin' | 'responsable';
  createdAt: string;
  nombre: string | null;
  responsable?: {
    id: string;
    userId: string;
    fincaId: string;
    nombre?: string;
    finca?: {
      id: string;
      nombre: string;
    };
  };
};

function UserModal({ onClose, userToEdit }: { onClose: () => void, userToEdit?: Usuario | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ 
    email: userToEdit?.email || '', 
    password: '', 
    role: userToEdit?.role || '', 
    nombre: userToEdit?.nombre || userToEdit?.responsable?.nombre || '', 
    fincaId: userToEdit?.responsable?.finca?.id || '' 
  });

  const { data: fincas = [] } = useQuery<Array<{ id: string; nombre: string }>>({
    queryKey: ['fincas'],
    queryFn: () => api.get('/fincas').then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: typeof form) => {
      const payload: Record<string, string> = { email: data.email, role: data.role };
      if (data.password) payload.password = data.password;
      if (data.nombre) payload.nombre = data.nombre;
      if (data.role === 'responsable' && data.fincaId) payload.fincaId = data.fincaId;
      
      if (userToEdit) {
        return api.patch(`/users/${userToEdit.id}`, payload);
      } else {
        if (!data.password) throw new Error('La contraseña es obligatoria para nuevos usuarios');
        return api.post('/users', payload);
      }
    },
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success(`Usuario "${data.nombre || data.email}" ${userToEdit ? 'actualizado' : 'creado'}`);
      onClose();
    },
    onError: (err: any) => {
      const msg = err instanceof Error ? err.message : (err?.response?.data?.message?.[0] ?? err?.response?.data?.message ?? 'Error al guardar usuario');
      toast.error(msg);
    }
  });

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <div className="px-6 py-4 border-b border-surface-border pr-12">
          <DialogTitle className="modal-title">{userToEdit ? 'Editar usuario' : 'Nuevo usuario'}</DialogTitle>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="p-6 space-y-4">
          <div>
            <label className="form-label">Nombre <span className="text-red-500 ml-0.5">*</span></label>
            <input type="text" required className="input-field" value={form.nombre}
              onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value.toUpperCase() }))}
              placeholder="Ej: ANDRES PEREZ" />
          </div>
          <div>
            <label className="form-label">Email <span className="text-red-500 ml-0.5">*</span></label>
            <input type="email" required className="input-field" value={form.email}
              autoComplete="off"
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="usuario@valleflor.com" />
          </div>
          <div>
            <label className="form-label">Contraseña {!userToEdit && <span className="text-red-500 ml-0.5">*</span>}</label>
            <input type="password" required={!userToEdit} minLength={8} className="input-field" value={form.password}
              autoComplete="new-password"
              onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder={userToEdit ? "Dejar en blanco para mantener" : "Mínimo 8 caracteres"} />
          </div>
          <div>
            <label className="form-label">Rol <span className="text-red-500 ml-0.5">*</span></label>
            <select required className="input-field" value={form.role}
              onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="" disabled>Selecciona un rol</option>
              <option value="responsable">Responsable</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {form.role === 'responsable' && (
            <div>
              <label className="form-label">Finca asignada</label>
              <select className="input-field" value={form.fincaId}
                onChange={(e) => setForm(p => ({ ...p, fincaId: e.target.value }))}>
                <option value="">Selecciona una finca</option>
                {fincas.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={save.isPending} className="btn-primary flex-1 justify-center">
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsuariosPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [userToEdit, setUserToEdit] = useState<Usuario | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'responsable'>('all');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; label: string } | null>(null);

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/users').then((r) => r.data),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return usuarios.filter((u) => {
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      const matchSearch = !q || u.email.toLowerCase().includes(q) || (u.nombre ?? u.responsable?.nombre ?? '').toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [usuarios, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSearchChange(v: string) { setSearch(v); setPage(1); }
  function handleRoleChange(v: typeof roleFilter) { setRoleFilter(v); setPage(1); }

  const remove = useMutation({
    mutationFn: ({ id }: { id: string; label: string }) => api.delete(`/users/${id}`),
    onSuccess: (_, { label }) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      qc.invalidateQueries({ queryKey: ['finca'] });
      qc.invalidateQueries({ queryKey: ['fincas'] });
      toast.success(`Usuario "${label}" eliminado`);
      setConfirmDelete(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'No se puede eliminar'),
  });

  return (
    <div className="w-full">
      <div className="page-header">
        <div className="min-w-0">
          <h1 className="section-title">Usuarios</h1>
          <p className="text-carbon-400 text-sm mt-1">Cuentas de acceso al sistema</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary w-full sm:w-auto shrink-0">
          <Plus className="w-4 h-4" />
          Nuevo usuario
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-carbon-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            className="input-field pl-9"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex rounded-lg border border-surface-border overflow-hidden text-sm">
          {(['all', 'responsable', 'admin'] as const).map((r) => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              className={`px-3 py-2 transition-colors ${
                roleFilter === r
                  ? 'bg-verde-600 text-white font-medium'
                  : 'bg-surface-raised text-carbon-400 hover:text-carbon-50 hover:bg-surface-overlay'
              }`}
            >
              {r === 'all' ? 'Todos' : r === 'admin' ? 'Admin' : 'Responsable'}
            </button>
          ))}
        </div>
      </div>

      <Table>
        <Thead>
          <Th>Nombre</Th>
          <Th>Email</Th>
          <Th>Rol</Th>
          <Th>Finca</Th>
          <Th>Creado</Th>
          <Th className="text-right">Acciones</Th>
        </Thead>
        <Tbody>
          {isLoading && <TrSkeleton cols={6} />}
          {!isLoading && filtered.length === 0 && (
            <TdEmpty colSpan={6} message={search || roleFilter !== 'all' ? 'Sin resultados' : 'Sin usuarios registrados'} />
          )}
          {paginated.map((u) => (
            <Tr key={u.id}>
              <Td className="font-medium text-carbon-50">
                {u.nombre ?? u.responsable?.nombre ?? <span className="text-carbon-400">—</span>}
              </Td>
              <Td className="text-carbon-400 font-mono text-xs">{u.email}</Td>
              <Td>
                <span className={`inline-flex items-center px-phi-1 py-[2px] rounded-sm text-xs font-medium ${
                  u.role === 'admin'
                    ? 'bg-verde-50 text-verde-600 border border-verde-100'
                    : 'bg-surface-overlay text-carbon-400 border border-surface-border'
                }`}>
                  {u.role === 'admin' ? 'Admin' : 'Responsable'}
                </span>
              </Td>
              <Td className="text-carbon-500 font-medium text-xs">
                {u.responsable?.finca?.nombre ?? <span className="text-carbon-300 font-normal">—</span>}
              </Td>
              <Td className="text-carbon-400 font-mono text-xs">
                {new Date(u.createdAt).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Td>
              <Td className="text-right">
                <button onClick={() => setUserToEdit(u)} className="text-carbon-400 hover:text-verde-600 transition-colors mr-3" title="Editar">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => setConfirmDelete({ id: u.id, label: u.nombre ?? u.responsable?.nombre ?? u.email })} className="text-carbon-400 hover:text-red-600 transition-colors" title="Eliminar">
                  <Trash2 className="w-4 h-4" />
                </button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-carbon-400">
          <span>{filtered.length} usuario{filtered.length !== 1 ? 's' : ''} · página {currentPage} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-surface-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                  p === currentPage
                    ? 'bg-verde-600 text-white'
                    : 'hover:bg-surface-overlay text-carbon-400 hover:text-carbon-50'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-surface-overlay disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {showCreate && <UserModal onClose={() => setShowCreate(false)} />}
      {userToEdit && <UserModal userToEdit={userToEdit} onClose={() => setUserToEdit(null)} />}

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar al usuario "${confirmDelete.label}"?`}
          onConfirm={() => remove.mutate(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          isPending={remove.isPending}
        />
      )}
    </div>
  );
}
