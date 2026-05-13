'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import { Loader2, Eye, EyeOff, Sprout, CalendarDays, PackageCheck } from 'lucide-react';

/* ─── Floating petal particles ─────────────────────────────────────── */
const FLOATING_PETALS = [
  { left: '12%', delay: '0s',    dur: '9s',   w: 10, h: 16, rot: 20  },
  { left: '28%', delay: '2.1s',  dur: '11s',  w: 7,  h: 12, rot: -15 },
  { left: '47%', delay: '0.6s',  dur: '8.5s', w: 12, h: 19, rot: 35  },
  { left: '63%', delay: '3.4s',  dur: '10s',  w: 8,  h: 13, rot: -28 },
  { left: '78%', delay: '1.3s',  dur: '12s',  w: 9,  h: 15, rot: 12  },
  { left: '91%', delay: '4.7s',  dur: '9.5s', w: 6,  h: 10, rot: -8  },
];

function FloatingPetals() {
  return (
    <>
      {FLOATING_PETALS.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            left: p.left,
            bottom: '-20px',
            width: p.w,
            height: p.h,
            background: 'rgba(255,255,255,0.22)',
            borderRadius: '50% 50% 50% 0 / 60% 60% 40% 40%',
            transform: `rotate(${p.rot}deg)`,
            animation: `petal-float ${p.dur} ease-in infinite ${p.delay}`,
          }}
        />
      ))}
    </>
  );
}

/* ─── SVG botanical scene ───────────────────────────────────────────── */
function BotanicalSVG() {
  /* petals: ellipse rotated around center of each flower */
  function Flower({
    cx, cy, size, petals, opacity, spinDur, spinDir = 1,
  }: {
    cx: number; cy: number; size: number; petals: number;
    opacity: number; spinDur?: number; spinDir?: 1 | -1;
  }) {
    const pLen = size * 0.58;
    const pW   = size * 0.18;
    const animStyle: React.CSSProperties | undefined = spinDur
      ? {
          animation: `slow-spin ${spinDur}s linear infinite ${spinDir === -1 ? 'reverse' : ''}`,
          transformBox: 'fill-box',
          transformOrigin: 'center',
        }
      : undefined;

    return (
      <g transform={`translate(${cx},${cy})`} opacity={opacity}>
        <g style={animStyle}>
          {Array.from({ length: petals }).map((_, j) => (
            <ellipse
              key={j}
              cx={0} cy={-pLen}
              rx={pW} ry={pLen}
              fill="white"
              transform={`rotate(${(360 / petals) * j})`}
            />
          ))}
          {/* stamen ring */}
          <circle cx={0} cy={0} r={size * 0.22} fill="rgba(240,192,64,0.55)" />
          <circle cx={0} cy={0} r={size * 0.12} fill="rgba(240,192,64,0.85)" />
        </g>
      </g>
    );
  }

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ── Hero flower — center right, slow rotation ── */}
      <Flower cx={70} cy={42} size={28} petals={8}  opacity={0.18} spinDur={38} />
      {/* inner counter-ring — gives a rose-within-rose feel */}
      <Flower cx={70} cy={42} size={16} petals={12} opacity={0.10} spinDur={55} spinDir={-1} />

      {/* ── Secondary flowers ── */}
      <Flower cx={14} cy={74} size={12} petals={6}  opacity={0.09} spinDur={60} />
      <Flower cx={88} cy={78} size={8}  petals={8}  opacity={0.07} />
      <Flower cx={28} cy={13} size={7}  petals={6}  opacity={0.08} spinDur={70} spinDir={-1} />
      <Flower cx={92} cy={16} size={5}  petals={8}  opacity={0.06} />
      <Flower cx={50} cy={90} size={6}  petals={6}  opacity={0.05} />

      {/* ── Botanical stems (agro-400 accent) ── */}
      {/* Left stem */}
      <path d="M 14,100 Q 16,86 12,74" fill="none" stroke="rgba(76,175,114,0.30)" strokeWidth="0.7" strokeLinecap="round"/>
      {/* Left leaf */}
      <path d="M 13,80 Q 22,75 24,66" fill="none" stroke="rgba(76,175,114,0.22)" strokeWidth="0.55" strokeLinecap="round"/>
      <ellipse cx={19} cy={72} rx={5} ry={2.5} fill="rgba(76,175,114,0.10)" transform="rotate(-25,19,72)"/>

      {/* Right bottom stem */}
      <path d="M 88,100 Q 90,88 88,78" fill="none" stroke="rgba(76,175,114,0.22)" strokeWidth="0.55" strokeLinecap="round"/>

      {/* Tall background stem */}
      <path d="M 50,100 Q 54,80 48,62 Q 43,46 52,30" fill="none" stroke="rgba(76,175,114,0.12)" strokeWidth="0.5" strokeLinecap="round"/>
      <path d="M 50,65 Q 60,60 62,52" fill="none" stroke="rgba(76,175,114,0.10)" strokeWidth="0.45" strokeLinecap="round"/>
      <ellipse cx={57} cy={57} rx={6} ry={2.5} fill="rgba(76,175,114,0.08)" transform="rotate(-20,57,57)"/>

      {/* Subtle dot field (background texture) */}
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 8 }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={col * 14 + 3}
            cy={row * 18 + 5}
            r={0.4}
            fill="white"
            opacity={0.06}
          />
        ))
      )}
    </svg>
  );
}

/* ─── Right brand panel ─────────────────────────────────────────────── */
const BrandPanel = React.memo(function BrandPanel() {
  return (
    <div
      className="hidden lg:flex flex-col relative overflow-hidden"
      style={{
        width: '56%',
        minHeight: '100vh',
        background: 'linear-gradient(150deg, #142E78 0%, #1B3FA0 60%, #1635a0 100%)',
      }}
    >
      <style>{`
        @keyframes slow-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes petal-float {
          0%   { transform: translateY(0)    rotate(var(--r, 0deg)) scale(1);    opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-105vh) rotate(calc(var(--r, 0deg) + 180deg)) scale(0.6); opacity: 0; }
        }
      `}</style>

      <BotanicalSVG />
      <FloatingPetals />

      {/* Radial vignette — focuses the eye on the center */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 70% at 68% 42%, transparent 30%, rgba(20,46,120,0.55) 100%)',
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col h-full px-12 py-12 z-10">

        {/* Logo */}
        <div className="mb-auto">
          <div
            className="inline-flex items-center px-4 py-2 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
          >
            <Image src="/logo.webp" alt="Valleflor" width={130} height={38} className="object-contain" priority />
          </div>
        </div>

        {/* Slogan block */}
        <div className="flex flex-col gap-5 mb-auto mt-auto">
          {/* Botanical ornament line */}
          <div className="flex items-center gap-3">
            <div className="h-px w-6" style={{ background: 'rgba(76,175,114,0.6)' }} />
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1C8 1 2 4 2 9.5A6 6 0 0 0 8 15A6 6 0 0 0 14 9.5C14 4 8 1 8 1Z" fill="rgba(76,175,114,0.5)"/>
              <line x1="8" y1="15" x2="8" y2="6" stroke="rgba(76,175,114,0.6)" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <div className="h-px w-6" style={{ background: 'rgba(76,175,114,0.6)' }} />
          </div>

          {/* Main slogan */}
          <div>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
              Nuestra filosofía
            </p>
            <h1
              style={{
                color: 'rgba(255,255,255,0.92)',
                fontSize: '2.4rem',
                fontStyle: 'italic',
                fontWeight: 300,
                lineHeight: 1.25,
                letterSpacing: '-0.5px',
                textShadow: '0 2px 24px rgba(0,0,0,0.35)',
              }}
            >
              Lo que uno<br />siembra...
            </h1>
            <h1
              style={{
                color: '#ffffff',
                fontSize: '2.4rem',
                fontStyle: 'italic',
                fontWeight: 700,
                lineHeight: 1.25,
                letterSpacing: '-0.5px',
                textShadow: '0 2px 24px rgba(0,0,0,0.35)',
              }}
            >
              Cosecha!
            </h1>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem', maxWidth: '26ch', lineHeight: 1.75 }}>
            Gestión de estimaciones florícolas en tiempo real, desde el campo hasta la exportación.
          </p>

          {/* Stat pillars */}
          <div className="flex gap-8 mt-3 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            {[
              { label: 'Registro en finca',    Icon: Sprout },
              { label: 'Planificación semanal', Icon: CalendarDays },
              { label: 'Control consolidado',  Icon: PackageCheck },
            ].map(({ label, Icon }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <Icon size={18} style={{ color: 'rgba(76,175,114,0.7)' }} />
                <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.68rem', lineHeight: 1.4 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-6" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.68rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          © {new Date().getFullYear()} Valleflor
        </div>
      </div>
    </div>
  );
});

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        toast.error(result.error === 'CONNECTION_ERROR'
          ? 'No se puede conectar al servidor. Intenta más tarde.'
          : 'Credenciales inválidas');
        return;
      }
      const { getSession } = await import('next-auth/react');
      const session = await getSession();
      const role = (session?.user as any)?.role;
      router.push(role === 'admin' ? '/admin/fincas' : '/responsable/estimaciones');
    } catch {
      toast.error('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <BrandPanel />

      {/* ── Form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white relative px-8 lg:px-16">
        {/* Subtle corner accents matching brand blue */}
        <div className="absolute top-0 left-0 w-52 h-52 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 0% 0%, rgba(27,63,160,0.05) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-44 h-44 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 100% 100%, rgba(27,63,160,0.04) 0%, transparent 70%)' }} />

        <div className="relative w-full max-w-sm animate-slide-up">
          {/* Brand header */}
          <div className="flex flex-col items-center mb-10">
            <div className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-verde-600 shadow-md mb-5">
              <Image src="/logo.webp" alt="Valleflor" width={150} height={44} className="object-contain" priority />
            </div>
            <h2 className="text-carbon-50 font-semibold text-lg">Bienvenido de vuelta</h2>
            <p className="text-carbon-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Form */}
          <div className="card border-surface-border/60 shadow-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="form-label" htmlFor="email">
                  Correo electrónico <span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  id="email" type="email" autoComplete="email" required
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-field" placeholder="usuario@valleflor.com"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="password">
                  Contraseña <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <input
                    id="password" type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10" placeholder="••••••••"
                  />
                  <button
                    type="button" tabIndex={-1}
                    onClick={() => setShowPwd((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="text-right -mt-1">
                <Link href="/auth/forgot-password" className="text-xs text-carbon-400 hover:text-verde-600 transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <button
                type="submit" id="btn-login" disabled={loading}
                className="btn-primary w-full justify-center py-2.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <span className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4" />Ingresando...</span>
                  : 'Ingresar'}
              </button>
            </form>
          </div>

          <p className="text-center text-carbon-400 text-xs mt-8">
            © {new Date().getFullYear()} Valleflor · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
