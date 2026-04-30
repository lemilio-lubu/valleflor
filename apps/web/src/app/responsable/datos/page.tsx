'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ProductoForm } from './components/ProductoForm';
import { VariedadForm } from './components/VariedadForm';
import { ColorForm } from './components/ColorForm';

type Section = 'productos' | 'variedades' | 'colores';

const sections: { key: Section; label: string; icon: string }[] = [
  { key: 'productos', label: 'Productos', icon: '🌹' },
  { key: 'variedades', label: 'Variedades', icon: '🪻' },
  { key: 'colores', label: 'Colores', icon: '🎨' },
];

export default function DatosPage() {
  const { data: session } = useSession();
  const fincaId = (session?.user as any)?.fincaId;

  const [open, setOpen] = useState<Record<Section, boolean>>({
    productos: true,
    variedades: false,
    colores: false,
  });

  function toggle(key: Section) {
    setOpen((p) => ({ ...p, [key]: !p[key] }));
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="section-title">Gestión de Datos</h1>
        <p className="text-carbon-400 text-sm mt-1">Administra productos, variedades y colores de tu finca</p>
      </div>

      <div className="space-y-4">
        {sections.map(({ key, label, icon }) => (
          <div key={key} className="card p-0 overflow-hidden">
            <button
              id={`toggle-${key}`}
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-overlay/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{icon}</span>
                <span className="font-medium text-carbon-100 text-sm uppercase tracking-widest font-mono">{label}</span>
              </div>
              <svg
                className={`w-4 h-4 text-carbon-400 transition-transform duration-200 ${open[key] ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open[key] && (
              <div className="px-6 pb-6 border-t border-surface-border animate-fade-in">
                <div className="pt-5">
                  {key === 'productos' && <ProductoForm fincaId={fincaId} />}
                  {key === 'variedades' && <VariedadForm fincaId={fincaId} />}
                  {key === 'colores' && <ColorForm fincaId={fincaId} />}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
