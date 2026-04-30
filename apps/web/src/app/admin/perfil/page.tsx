'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound, ChevronDown } from 'lucide-react';

export default function AdminPerfilPage() {
  const { data: session, update } = useSession();
  const email = session?.user?.email ?? '';
  const nombreInicial = (session?.user as any)?.nombre ?? '';

  const [form, setForm] = useState({ email, nombre: nombreInicial });
  const [changePass, setChangePass] = useState(false);
  const [pass, setPass] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const save = useMutation({
    mutationFn: () => {
      const payload: Record<string, string> = {};
      if (form.email && form.email !== email) payload.email = form.email;
      if (changePass && pass.password) {
        payload.currentPassword = pass.currentPassword;
        payload.password = pass.password;
      }
      if (form.nombre.trim()) payload.nombre = form.nombre.trim();
      return api.patch('/auth/profile', payload);
    },
    onSuccess: async () => {
      await update({ email: form.email, nombre: form.nombre.trim() });
      setPass({ currentPassword: '', password: '', confirmPassword: '' });
      setChangePass(false);
      toast.success('Perfil actualizado');
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Error al guardar'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (changePass && pass.password !== pass.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (changePass && !pass.currentPassword) {
      toast.error('Ingresa tu contraseña actual');
      return;
    }
    if (changePass && pass.password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    save.mutate();
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-8">
        <h1 className="section-title">Mi perfil</h1>
        <p className="text-carbon-400 text-sm mt-1">Actualiza tu nombre, email o contraseña</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-field"
              value={form.nombre}
              onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value.toUpperCase() }))}
              placeholder="Ej: JUAN PÉREZ"
            />
          </div>

          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              required
              className="input-field"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div className="border-t border-surface-border pt-4">
            <button
              type="button"
              onClick={() => { setChangePass(v => !v); setPass({ currentPassword: '', password: '', confirmPassword: '' }); }}
              className="flex items-center gap-2 text-sm text-carbon-300 hover:text-carbon-50 transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              Cambiar contraseña
              <ChevronDown className={`w-4 h-4 transition-transform ${changePass ? 'rotate-180' : ''}`} />
            </button>

            {changePass && (
              <div className="mt-4 space-y-4 animate-fade-in">
                <div>
                  <label className="form-label">Contraseña actual</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="Tu contraseña actual"
                      value={pass.currentPassword}
                      onChange={(e) => setPass(p => ({ ...p, currentPassword: e.target.value }))}
                      autoComplete="current-password"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowCurrent(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50">
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label">Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="Mínimo 8 caracteres"
                      value={pass.password}
                      onChange={(e) => setPass(p => ({ ...p, password: e.target.value }))}
                      autoComplete="new-password"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label">Confirmar contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="input-field pr-10"
                      placeholder="Repite la contraseña"
                      value={pass.confirmPassword}
                      onChange={(e) => setPass(p => ({ ...p, confirmPassword: e.target.value }))}
                      autoComplete="new-password"
                    />
                    <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
