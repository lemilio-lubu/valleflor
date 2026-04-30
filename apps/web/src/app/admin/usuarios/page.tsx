'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Finca {
  id: string;
  nombre: string;
}

export default function UsuariosPage() {
  const [form, setForm] = useState({ email: '', password: '', role: 'responsable', nombre: '', fincaId: '' });

  const { data: fincas = [] } = useQuery<Finca[]>({
    queryKey: ['fincas'],
    queryFn: () => api.get('/fincas').then((res) => res.data),
  });

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/users', data),
    onSuccess: () => {
      toast.success('Usuario creado');
      setForm({ email: '', password: '', role: 'responsable', nombre: '', fincaId: '' });
    },
    onError: () => toast.error('Error al crear usuario'),
  });

  return (
    <div className="max-w-md">
      <div className="mb-8">
        <h1 className="section-title">Crear Usuario</h1>
        <p className="text-carbon-400 text-sm mt-1">Crea cuentas de acceso al sistema</p>
      </div>
      <div className="card">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-carbon-300 mb-1.5">Email</label>
            <input type="email" required className="input-field" value={form.email}
              onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="usuario@villaflor.com"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-carbon-300 mb-1.5">Contraseña</label>
            <input type="password" required className="input-field" value={form.password}
              onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-carbon-300 mb-1.5">Rol</label>
            <select className="input-field" value={form.role}
              onChange={(e) => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="responsable">Responsable</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {form.role === 'responsable' && (
            <div className="space-y-5 pt-3 border-t border-surface-border animate-fade-in">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-carbon-300 mb-1.5">Nombre del Responsable</label>
                <input type="text" required={form.role === 'responsable'} className="input-field" value={form.nombre}
                  onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value.toUpperCase() }))}
                  placeholder="Ej: ANDRES PEREZ"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-carbon-300 mb-1.5">Finca Asignada</label>
                <select className="input-field" required={form.role === 'responsable'} value={form.fincaId}
                  onChange={(e) => setForm(p => ({ ...p, fincaId: e.target.value }))}>
                  <option value="">Selecciona una finca</option>
                  {fincas.map(f => (
                    <option key={f.id} value={f.id}>{f.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button type="submit" id="btn-crear-usuario" disabled={create.isPending} className="btn-primary w-full justify-center py-2.5">
            {create.isPending ? 'Creando...' : 'Crear usuario'}
          </button>
          {create.isSuccess && (
            <div className="p-3 bg-verde-900/30 border border-verde-700/40 rounded-md text-verde-400 text-sm font-mono animate-fade-in">
              ✓ Usuario creado exitosamente
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
