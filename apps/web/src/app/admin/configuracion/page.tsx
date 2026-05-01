'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Settings } from 'lucide-react';

interface Configuracion { id: number; tallosPorCaja: number; updatedAt: string; }

export default function ConfiguracionPage() {
  const qc = useQueryClient();
  const [valor, setValor] = useState('');

  const { data, isLoading } = useQuery<Configuracion>({
    queryKey: ['configuracion'],
    queryFn: () => api.get('/configuracion').then((r) => r.data),
  });

  useEffect(() => {
    if (data) setValor(String(data.tallosPorCaja));
  }, [data]);

  const save = useMutation({
    mutationFn: (tallosPorCaja: number) => api.patch('/configuracion', { tallosPorCaja }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['configuracion'] }); toast.success('Configuración guardada'); },
    onError: () => toast.error('Error al guardar'),
  });

  return (
    <div className="w-full max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-5 h-5 text-carbon-400" />
        <h1 className="section-title">Configuración</h1>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-carbon-50 mb-1">Tallos por caja</h2>
          <p className="text-xs text-carbon-400 mb-4">
            Constante que multiplica las cajas para obtener tallos.<br />
            Ejemplo: 1 caja × <strong>{data?.tallosPorCaja ?? 400}</strong> = <strong>{data?.tallosPorCaja ?? 400}</strong> tallos.
          </p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="form-label">Tallos / caja</label>
              <input
                type="number"
                min="1"
                className="input-field"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <button
              className="btn-primary"
              disabled={save.isPending || isLoading || !valor || Number(valor) < 1}
              onClick={() => save.mutate(Number(valor))}
            >
              {save.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        {data?.updatedAt && (
          <p className="text-[11px] text-carbon-400">
            Última actualización: {new Date(data.updatedAt).toLocaleString('es-CO')}
          </p>
        )}
      </div>
    </div>
  );
}
