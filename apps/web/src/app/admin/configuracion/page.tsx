'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings, Search } from 'lucide-react';

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
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-5 h-5 text-carbon-400" />
        <h1 className="section-title">Configuración — Tallos por Caja</h1>
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex items-center gap-2 text-carbon-400">
          <Search className="w-4 h-4" />
          <span className="text-xs font-medium">Filtrar</span>
        </div>

        <div>
          <label className="form-label">Finca</label>
          <select
            className="input-field min-w-[160px]"
            value={filtroFinca}
            onChange={(e) => { setFiltroFinca(e.target.value); setFiltroProducto(''); }}
          >
            <option value="">Todas</option>
            {fincas.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label className="form-label">Producto</label>
          <select
            className="input-field min-w-[160px]"
            value={filtroProducto}
            onChange={(e) => setFiltroProducto(e.target.value)}
          >
            <option value="">Todos</option>
            {productos.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-carbon-400 text-sm">Cargando...</div>
        ) : filas.length === 0 ? (
          <div className="p-8 text-center text-carbon-400 text-sm">Sin resultados</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-carbon-700 text-carbon-400 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Finca</th>
                  <th className="px-4 py-3 text-left">Producto</th>
                  <th className="px-4 py-3 text-left">Variedad</th>
                  <th className="px-4 py-3 text-left">Color</th>
                  <th className="px-4 py-3 text-left w-36">Tallos / Caja</th>
                  <th className="px-4 py-3 text-left w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filas.map((color) => {
                  const valor = getValor(color);
                  const dirty = edits[color.id] !== undefined;
                  const saving = save.isPending && save.variables?.id === color.id;
                  return (
                    <tr key={color.id} className="border-b border-carbon-800 hover:bg-carbon-800/40">
                      <td className="px-4 py-3 text-carbon-200">{color.variedad.producto.finca.nombre}</td>
                      <td className="px-4 py-3 text-carbon-200">{color.variedad.producto.nombre}</td>
                      <td className="px-4 py-3 text-carbon-300">{color.variedad.nombre}</td>
                      <td className="px-4 py-3 text-carbon-300">{color.nombre}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          className="input-field w-28 text-sm"
                          value={valor}
                          onChange={(e) =>
                            setEdits((prev) => ({ ...prev, [color.id]: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="btn-primary text-xs py-1 px-3 disabled:opacity-40"
                          disabled={!dirty || saving || Number(valor) < 1}
                          onClick={() => handleGuardar(color)}
                        >
                          {saving ? '...' : 'Guardar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] text-carbon-500">
        {filas.length} color{filas.length !== 1 ? 'es' : ''} mostrado{filas.length !== 1 ? 's' : ''}.
        Los cambios aplican al próximo cálculo de la Plantilla Diaria.
      </p>
    </div>
  );
}
