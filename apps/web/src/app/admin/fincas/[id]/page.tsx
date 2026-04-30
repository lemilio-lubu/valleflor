'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useState } from 'react';
import Link from 'next/link';

interface Responsable { id: string; nombre: string; userId: string; user?: { email: string }; }
interface Finca { id: string; nombre: string; ubicacion?: string; responsables?: Responsable[]; }

export default function FincaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [nombre, setNombre] = useState('');

  const { data: finca, isLoading } = useQuery<Finca>({
    queryKey: ['finca', id],
    queryFn: () => api.get(`/fincas/${id}`).then((r) => r.data),
  });

  const addResp = useMutation({
    mutationFn: (data: { userId: string; nombre: string; fincaId: string }) =>
      api.post('/responsables', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finca', id] });
      toast.success('Responsable asignado');
      setShowAdd(false); setUserId(''); setNombre('');
    },
    onError: () => toast.error('Error al asignar responsable'),
  });

  if (isLoading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-verde-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/fincas" className="text-carbon-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="section-title">{finca?.nombre}</h1>
          {finca?.ubicacion && <p className="text-carbon-400 text-sm font-mono mt-0.5">{finca.ubicacion}</p>}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-medium text-carbon-200">Responsables</h2>
          <button id="btn-add-responsable" onClick={() => setShowAdd(!showAdd)} className="btn-ghost text-xs py-1.5">
            {showAdd ? 'Cancelar' : '+ Asignar responsable'}
          </button>
        </div>

        {showAdd && (
          <form
            onSubmit={(e) => { e.preventDefault(); addResp.mutate({ userId, nombre, fincaId: id }); }}
            className="mb-5 p-4 bg-surface-overlay rounded-lg border border-surface-border space-y-3"
          >
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-carbon-300 mb-1">User ID</label>
              <input className="input-field text-xs font-mono" required value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid del usuario" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-carbon-300 mb-1">Nombre</label>
              <input className="input-field" required value={nombre}
                onInput={(e) => { (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase(); }}
                onChange={(e) => setNombre(e.target.value.toUpperCase())}
              />
            </div>
            <button type="submit" disabled={addResp.isPending} className="btn-primary text-xs py-1.5">
              {addResp.isPending ? 'Guardando...' : 'Asignar'}
            </button>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left py-2 px-3 text-xs font-mono uppercase tracking-widest text-carbon-400">Nombre</th>
              <th className="text-left py-2 px-3 text-xs font-mono uppercase tracking-widest text-carbon-400">Email</th>
            </tr>
          </thead>
          <tbody>
            {(!finca?.responsables || finca.responsables.length === 0) && (
              <tr><td colSpan={2} className="text-center py-8 text-carbon-400 font-mono text-sm">Sin responsables asignados</td></tr>
            )}
            {finca?.responsables?.map((r) => (
              <tr key={r.id} className="table-row-hover border-b border-surface-border/30">
                <td className="py-3 px-3 font-medium text-carbon-100">{r.nombre}</td>
                <td className="py-3 px-3 text-carbon-400 font-mono text-xs">{r.user?.email ?? r.userId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
