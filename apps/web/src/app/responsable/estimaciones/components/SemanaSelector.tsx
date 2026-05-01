'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { ConfirmModal } from '@/app/components/ConfirmModal';

interface Semana { id: string; numeroSemana: number; anio: number; fechaInicio: string; fechaFin: string; }

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDeleted?: (id: string) => void;
}

export function SemanaSelector({ selectedId, onSelect, onDeleted }: Props) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<Semana | null>(null);

  const { data, isLoading } = useQuery<{ data: Semana[] }>({
    queryKey: ['semanas'],
    queryFn: () => api.get('/semanas', { params: { limit: 20 } }).then((r) => r.data),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/semanas/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['semanas'] });
      toast.success(`Semana ${confirmDelete?.numeroSemana} eliminada`);
      if (onDeleted) onDeleted(id);
      setConfirmDelete(null);
    },
    onError: () => toast.error('Error al eliminar semana'),
  });

  const semanas = data?.data ?? [];

  if (isLoading) return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 w-20 bg-surface-overlay rounded-lg animate-pulse flex-shrink-0" />
      ))}
    </div>
  );

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {semanas.length === 0 && (
          <p className="text-carbon-400 text-sm">Sin semanas creadas</p>
        )}
        {semanas.map((s) => (
          <div
            key={s.id}
            className={`group flex-shrink-0 relative flex flex-col items-center justify-center px-4 py-3 rounded-lg border transition-all duration-150 min-w-[80px] cursor-pointer ${
              selectedId === s.id
                ? 'border-verde-600 bg-verde-50 text-verde-600 shadow-verde-sm'
                : 'border-surface-border bg-surface-overlay text-carbon-400 hover:border-verde-100 hover:text-carbon-50'
            }`}
            onClick={() => onSelect(s.id)}
          >
            <span className="text-lg font-mono font-medium leading-none">{s.numeroSemana}</span>
            <span className="text-[10px] mt-1 opacity-60">{s.anio}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(s); }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-raised border border-surface-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:border-red-300"
              title="Eliminar semana"
            >
              <Trash2 className="w-2.5 h-2.5 text-carbon-400 hover:text-red-600" />
            </button>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`¿Eliminar la semana ${confirmDelete.numeroSemana} (${confirmDelete.anio})? Se borrarán todos los registros diarios.`}
          onConfirm={() => remove.mutate(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
          confirmLabel="Eliminar"
          isPending={remove.isPending}
        />
      )}
    </>
  );
}
