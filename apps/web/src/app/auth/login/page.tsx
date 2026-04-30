'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

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
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(27,63,160,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(27,63,160,0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />
      {/* Glow orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-verde-50 rounded-full blur-3xl pointer-events-none opacity-60" />

      <div className="relative w-full max-w-sm mx-auto px-6 animate-slide-up">
        {/* Logo / Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-verde-600 shadow-md mb-4">
            <Image src="/logo.webp" alt="Valleflor" width={160} height={46} className="object-contain" priority />
          </div>
          <p className="text-carbon-400 text-sm mt-3">Sistema de estimaciones florícolas</p>
        </div>

        {/* Form card */}
        <div className="card border-surface-border/60 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="form-label" htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="usuario@valleflor.com"
              />
            </div>
            <div>
              <label className="form-label" htmlFor="password">Contraseña</label>
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
                  <Loader2 className="animate-spin w-4 h-4" />
                  Ingresando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-carbon-400 text-xs mt-8">
          © {new Date().getFullYear()} Valleflor · Todos los derechos reservados
        </p>
      </div>
    </div>
  );
}
