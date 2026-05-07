'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Filter, X } from 'lucide-react';
import { Table, Thead, Th, Tbody, Tr, Td, TdEmpty, TrSkeleton } from '@/app/components/Table';

interface ColorCatalogo {
  id: string;
  nombre: string;
  tallosPorCaja: number;
  variedadId: string;
  variedad: {
    id: string;
    nombre: string;
    producto: {
      id: string;
      nombre: string;
      finca: {
        id: string;
        nombre: string;
      };
    };
  };
}

export default function ConfiguracionPage() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [filtroFinca, setFiltroFinca] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('');

  const { data: colores = [], isLoading } = useQuery<ColorCatalogo[]>({
    queryKey: ['colores-catalogo'],
    queryFn: () => api.get('/colores').then((r) => r.data),
    select: (data) => data.filter((c) => c.variedad?.producto?.finca),
  });

  const fincas = useMemo(
    () => [...new Set(colores.map((c) => c.variedad.producto.finca.nombre))].sort(),
    [colores],
  );

  const productos = useMemo(() => {
    const fuente = filtroFinca
      ? colores.filter((c) => c.variedad.producto.finca.nombre === filtroFinca)
      : colores;
    return [...new Set(fuente.map((c) => c.variedad.producto.nombre))].sort();
  }, [colores, filtroFinca]);

  const filas = useMemo(() => {
    return colores.filter((c) => {
      if (filtroFinca && c.variedad.producto.finca.nombre !== filtroFinca) return false;
      if (filtroProducto && c.variedad.producto.nombre !== filtroProducto) return false;
      return true;
    });
  }, [colores, filtroFinca, filtroProducto]);

  const getValor = (color: ColorCatalogo) =>
    edits[color.id] !== undefined ? edits[color.id] : String(color.tallosPorCaja);

  const save = useMutation({
    mutationFn: ({ id, tallosPorCaja }: { id: string; tallosPorCaja: number }) =>
      api.patch(`/colores/${id}`, { tallosPorCaja }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['colores-catalogo'] });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Guardado');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const handleGuardar = (color: ColorCatalogo) => {
    const val = Number(getValor(color));
    if (!val || val < 1) return;
    save.mutate({ id: color.id, tallosPorCaja: val });
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="section-title">Configuración</h1>
        <p className="text-carbon-400 text-sm mt-1">Configura los tallos por caja para cada color del catálogo</p>
      </div>

      {/* Filtros */}
      {(() => {
        const activos = [filtroFinca, filtroProducto].filter(Boolean).length;
        const limpiar = () => { setFiltroFinca(''); setFiltroProducto(''); };
        return (
          <div className="bg-surface-overlay border border-surface-border rounded-lg p-3 mb-6">
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
                <button onClick={limpiar} className="flex items-center gap-1 text-[11px] text-carbon-400 hover:text-carbon-50 transition-colors">
                  <X className="w-3 h-3" />
                  Limpiar filtros
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Finca</label>
                <div className="relative">
                  <select className="input-field text-xs w-full pr-7" value={filtroFinca} onChange={(e) => { setFiltroFinca(e.target.value); setFiltroProducto(''); }}>
                    <option value="">Todas</option>
                    {fincas.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  {filtroFinca && (
                    <button onClick={() => { setFiltroFinca(''); setFiltroProducto(''); }} className="absolute right-6 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">Producto</label>
                <div className="relative">
                  <select className="input-field text-xs w-full pr-7" value={filtroProducto} onChange={(e) => setFiltroProducto(e.target.value)}>
                    <option value="">Todos</option>
                    {productos.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {filtroProducto && (
                    <button onClick={() => setFiltroProducto('')} className="absolute right-6 top-1/2 -translate-y-1/2 text-carbon-400 hover:text-carbon-50 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabla */}
      <Table compact>
        <Thead>
          <Th>Finca</Th>
          <Th>Producto</Th>
          <Th>Variedad</Th>
          <Th>Color</Th>
          <Th className="w-36">Tallos / Caja</Th>
          <Th className="w-24" />
        </Thead>
        <Tbody>
          {isLoading && <TrSkeleton cols={6} />}
          {!isLoading && filas.length === 0 && <TdEmpty colSpan={6} message="Sin resultados" />}
          {filas.map((color) => {
            const valor = getValor(color);
            const dirty = edits[color.id] !== undefined;
            const saving = save.isPending && save.variables?.id === color.id;
            return (
              <Tr key={color.id}>
                <Td className="font-medium text-carbon-50">{color.variedad.producto.finca.nombre}</Td>
                <Td className="text-carbon-200">{color.variedad.producto.nombre}</Td>
                <Td className="text-carbon-400">{color.variedad.nombre}</Td>
                <Td className="text-carbon-400">{color.nombre}</Td>
                <Td>
                  <input
                    type="number"
                    min="1"
                    className="input-field w-28 text-sm"
                    value={valor}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [color.id]: e.target.value }))}
                  />
                </Td>
                <Td>
                  <button
                    className="btn-primary text-xs py-1 px-3 disabled:opacity-40"
                    disabled={!dirty || saving || Number(valor) < 1}
                    onClick={() => handleGuardar(color)}
                  >
                    {saving ? '...' : 'Guardar'}
                  </button>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>

      <p className="mt-4 text-[11px] text-carbon-500">
        {filas.length} color{filas.length !== 1 ? 'es' : ''} mostrado{filas.length !== 1 ? 's' : ''}.
        Los cambios aplican al próximo cálculo de la Plantilla Diaria.
      </p>
    </div>
  );
}
