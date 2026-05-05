'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CatalogoProductos } from '@/app/components/catalogo/CatalogoProductos';
import { BulkUploadCatalog } from './BulkUploadCatalog';
import { ChevronDown } from 'lucide-react';

interface Finca { id: string; nombre: string; ubicacion?: string; }

export default function CatalogoPage() {
  const [selectedFincaId, setSelectedFincaId] = useState<string>('');

  const { data: fincas = [], isLoading } = useQuery<Finca[]>({
    queryKey: ['fincas'],
    queryFn: () => api.get('/fincas').then((r) => r.data),
  });

  const selectedFinca = fincas.find((f) => f.id === selectedFincaId);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Catálogo de productos</h1>
          <p className="text-carbon-400 text-sm mt-1">Gestiona productos, variedades y colores por finca</p>
        </div>
      </div>

      {/* Carga Masiva */}
      <BulkUploadCatalog />

      {/* Selector de finca */}
      <div className="mb-6">
        <label className="form-label">Finca</label>
        <div className="relative max-w-xs">
          <select
            className="input-field appearance-none pr-8"
            value={selectedFincaId}
            onChange={(e) => setSelectedFincaId(e.target.value)}
            disabled={isLoading}
          >
            <option value="">— Selecciona una finca —</option>
            {fincas.map((f) => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-carbon-400 pointer-events-none" />
        </div>
      </div>

      {/* Catálogo */}
      {!selectedFincaId && (
        <div className="rounded-xl border border-dashed border-surface-border py-20 text-center">
          <p className="text-carbon-400 text-sm">Selecciona una finca para ver su catálogo</p>
        </div>
      )}

      {selectedFincaId && (
        <div className="card">
          <CatalogoProductos fincaId={selectedFincaId} key={selectedFincaId} />
        </div>
      )}
    </div>
  );
}
