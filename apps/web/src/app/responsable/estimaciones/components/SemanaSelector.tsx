'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Semana { id: string; numeroSemana: number; anio: number; fechaInicio: string; fechaFin: string; }

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SemanaSelector({ selectedId, onSelect }: Props) {
  const { data, isLoading } = useQuery<{ data: Semana[] }>({
    queryKey: ['semanas'],
    queryFn: () => api.get('/semanas', { params: { limit: 20 } }).then((r) => r.data),
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
    <div className="flex gap-2 overflow-x-auto pb-2">
      {semanas.length === 0 && (
        <p className="text-carbon-400 text-sm">Sin semanas creadas</p>
      )}
      {semanas.map((s) => (
        <button
          key={s.id}
          id={`semana-${s.id}`}
          onClick={() => onSelect(s.id)}
          className={`flex-shrink-0 flex flex-col items-center justify-center px-4 py-3 rounded-lg border transition-all duration-150 min-w-[80px] ${
            selectedId === s.id
              ? 'border-verde-600 bg-verde-50 text-verde-600 shadow-verde-sm'
              : 'border-surface-border bg-surface-overlay text-carbon-400 hover:border-verde-100 hover:text-carbon-50'
          }`}
        >
          <span className="text-lg font-mono font-medium leading-none">{s.numeroSemana}</span>
          <span className="text-[10px] mt-1 opacity-60">{s.anio}</span>
        </button>
      ))}
    </div>
  );
}
