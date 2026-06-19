'use client';

import { CatalogoProductos } from '@/app/components/catalogo/CatalogoProductos';
import { BulkUploadCatalog } from './BulkUploadCatalog';

export default function CatalogoPage() {
  return (
    <div className="w-full">
      <div className="page-header mb-8">
        <div className="min-w-0">
          <h1 className="section-title">Catálogo de productos</h1>
          <p className="text-carbon-400 text-sm mt-1">
            Catálogo único de productos, variedades y colores para toda la operación
          </p>
        </div>
      </div>

      {/* Carga masiva */}
      <BulkUploadCatalog />

      {/* Catálogo global */}
      <div className="card">
        <CatalogoProductos />
      </div>
    </div>
  );
}
