'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { ProductoForm } from './components/ProductoForm';
import { VariedadForm } from './components/VariedadForm';
import { ColorForm } from './components/ColorForm';
import { ChevronDown, Package, Layers, Palette, type LucideIcon } from 'lucide-react';

type Section = 'productos' | 'variedades' | 'colores';

const sections: { key: Section; label: string; Icon: LucideIcon }[] = [
  { key: 'productos', label: 'Productos', Icon: Package },
  { key: 'variedades', label: 'Variedades', Icon: Layers },
  { key: 'colores', label: 'Colores', Icon: Palette },
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
        {sections.map(({ key, label, Icon }) => (
          <div key={key} className="card p-0 overflow-hidden">
            <button
              id={`toggle-${key}`}
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-overlay/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-carbon-300" />
                <span className="font-medium text-carbon-50 text-sm">{label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-carbon-400 transition-transform duration-200 ${open[key] ? 'rotate-180' : ''}`} />
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
