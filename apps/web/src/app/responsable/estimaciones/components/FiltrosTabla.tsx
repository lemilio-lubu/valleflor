'use client';

import { Filter, X } from 'lucide-react';

export interface ItemFiltrable {
  producto: string;
  variedad: string;
  color: string;
}

interface Props {
  items: ItemFiltrable[];
  filtroProducto: string;
  filtroVariedad: string;
  filtroColor: string;
  onProducto: (v: string) => void;
  onVariedad: (v: string) => void;
  onColor: (v: string) => void;
}

export function FiltrosTabla({
  items,
  filtroProducto, filtroVariedad, filtroColor,
  onProducto, onVariedad, onColor,
}: Props) {
  const activos = [filtroProducto, filtroVariedad, filtroColor].filter(Boolean).length;

  const productos = Array.from(new Set(items.map((r) => r.producto))).sort();

  const variedades = Array.from(new Set(
    items
      .filter((r) => !filtroProducto || r.producto === filtroProducto)
      .map((r) => r.variedad)
  )).sort();

  const colores = Array.from(new Set(
    items
      .filter((r) => !filtroProducto || r.producto === filtroProducto)
      .filter((r) => !filtroVariedad || r.variedad === filtroVariedad)
      .map((r) => r.color)
  )).sort();

  const handleProducto = (v: string) => {
    onProducto(v);
    // resetear dependientes si ya no aplican
    if (filtroVariedad && !items.some((r) => r.producto === v && r.variedad === filtroVariedad)) {
      onVariedad('');
      onColor('');
    } else if (filtroColor && !items.some((r) => r.producto === v && r.color === filtroColor)) {
      onColor('');
    }
  };

  const handleVariedad = (v: string) => {
    onVariedad(v);
    // resetear color si ya no aplica
    if (filtroColor && !items.some((r) => r.variedad === v && r.color === filtroColor)) {
      onColor('');
    }
  };

  const limpiar = () => { onProducto(''); onVariedad(''); onColor(''); };

  return (
    <div className="bg-surface-overlay border border-surface-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-carbon-400">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs font-medium uppercase tracking-wider">Filtros</span>
          {activos > 0 && (
            <span className="bg-verde-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {activos}
            </span>
          )}
        </div>
        {activos > 0 && (
          <button
            onClick={limpiar}
            className="flex items-center gap-1 text-[11px] text-carbon-400 hover:text-carbon-50 transition-colors"
          >
            <X className="w-3 h-3" />
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Producto</label>
          <div className="relative">
            <select className="input-field text-xs w-full pr-7" value={filtroProducto} onChange={(e) => handleProducto(e.target.value)}>
              <option value="">Todos</option>
              {productos.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {filtroProducto && (
              <button onClick={() => handleProducto('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Variedad</label>
          <div className="relative">
            <select className="input-field text-xs w-full pr-7" value={filtroVariedad} onChange={(e) => handleVariedad(e.target.value)}>
              <option value="">Todas</option>
              {variedades.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            {filtroVariedad && (
              <button onClick={() => handleVariedad('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Color</label>
          <div className="relative">
            <select className="input-field text-xs w-full pr-7" value={filtroColor} onChange={(e) => onColor(e.target.value)}>
              <option value="">Todos</option>
              {colores.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {filtroColor && (
              <button onClick={() => onColor('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
