'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Loader2, MailCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

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

        <div className="card border-surface-border/60 shadow-lg">
          {sent ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-agro-50 border border-agro-100 mb-4">
                <MailCheck className="w-6 h-6 text-agro-600" />
              </div>
              <h2 className="font-semibold text-carbon-50 mb-2">Revisa tu correo</h2>
              <p className="text-carbon-400 text-sm">
                Si existe una cuenta con <span className="text-carbon-50 font-medium">{email}</span>, recibirás un enlace para restablecer tu contraseña.
              </p>
            </div>
          ) : (
            <>
              <h2 className="modal-title mb-1">Recuperar contraseña</h2>
              <p className="text-carbon-400 text-sm mb-phi-4">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <form onSubmit={handleSubmit} className="space-y-phi-3">
                <div>
                  <label className="form-label" htmlFor="email">Correo electrónico</label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="usuario@valleflor.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-phi-1">
                      <Loader2 className="animate-spin w-4 h-4" />
                      Enviando...
                    </span>
                  ) : 'Enviar enlace'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-phi-4">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-phi-1 text-sm text-carbon-400 hover:text-carbon-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
