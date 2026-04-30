'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (!token) {
      toast.error('Token inválido');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Token inválido o expirado');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card border-surface-border/60 shadow-lg">
      {done ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-agro-50 border border-agro-100 mb-4">
            <CheckCircle2 className="w-6 h-6 text-agro-600" />
          </div>
          <h2 className="font-semibold text-carbon-50 mb-2">Contraseña actualizada</h2>
          <p className="text-carbon-400 text-sm">Serás redirigido al inicio de sesión en unos segundos.</p>
        </div>
      ) : (
        <>
          <h2 className="modal-title mb-1">Nueva contraseña</h2>
          <p className="text-carbon-400 text-sm mb-phi-4">Elige una contraseña segura de al menos 8 caracteres.</p>
          <form onSubmit={handleSubmit} className="space-y-phi-3">
            <div>
              <label className="form-label" htmlFor="password">Nueva contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="form-label" htmlFor="confirm">Confirmar contraseña</label>
              <div className="relative">
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Repite la contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-phi-1">
                  <Loader2 className="animate-spin w-4 h-4" />
                  Guardando...
                </span>
              ) : 'Guardar contraseña'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(27,63,160,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(27,63,160,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-verde-50 rounded-full blur-3xl pointer-events-none opacity-60" />

      <div className="relative w-full max-w-sm mx-auto px-6 animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-verde-600 shadow-md mb-4">
            <Image src="/logo.webp" alt="Valleflor" width={160} height={46} className="object-contain" priority />
          </div>
        </div>

        <Suspense fallback={<div className="card shadow-lg h-48 animate-pulse bg-surface-overlay" />}>
          <ResetPasswordForm />
        </Suspense>

        <div className="text-center mt-phi-4">
          <Link href="/auth/login" className="text-sm text-carbon-400 hover:text-carbon-50 transition-colors">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
