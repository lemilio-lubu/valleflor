'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast.error('Credenciales inválidas');
        return;
      }
      // Fetch session to know the role
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      const role = (session?.user as any)?.role;
      if (role === 'admin') router.push('/admin/fincas');
      else router.push('/responsable/datos');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(22,163,74,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22,163,74,0.5) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-verde-700/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-sm mx-auto px-6 animate-slide-up">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-verde-600/20 border border-verde-700/40 shadow-verde-sm mb-4">
            <svg className="w-7 h-7 text-verde-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.7.7m14.14 14.14.7.7M3 12H2m20 0h-1M4.22 19.78l.7-.7M19.07 4.93l-.7.7M12 7a5 5 0 100 10A5 5 0 0012 7z" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-carbon-50 tracking-tight">Villaflor</h1>
          <p className="text-carbon-400 text-sm mt-1 font-mono">Sistema de estimaciones florícolas</p>
        </div>

        {/* Form card */}
        <div className="card border-surface-border/60 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-carbon-300 uppercase tracking-widest mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="usuario@villaflor.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-carbon-300 uppercase tracking-widest mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              id="btn-login"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-carbon-400/50 text-xs mt-8 font-mono">
          © {new Date().getFullYear()} Villaflor · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
