'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { X, Download, Filter, FilterX } from 'lucide-react';
import { Table, Thead, Th, Tbody, Tr, Td, TdEmpty, TrSkeleton } from '@/app/components/Table';

export type ModuloAuditoria = 'fincas' | 'usuarios' | 'catálogo' | 'producción';

interface MovimientoCambio {
  id: string;
  responsable: string;
  accion: string;
  modulo: string;
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
}

interface Acceso {
  responsable: string;
  fecha: string;
}

interface Props {
  modulo: ModuloAuditoria;
  moduloLabel: string;
  onClose: () => void;
}

// Acciones posibles en el filtro (algunas no aplican a todos los módulos, pero
// no estorban: el backend simplemente no devuelve coincidencias).
const ACCIONES = [
  'Creación',
  'Edición',
  'Baja',
  'Alta',
  'Asignación de responsable',
  'Carga masiva',
];

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function AuditoriaModal({ modulo, moduloLabel, onClose }: Props) {
  const [tab, setTab] = useState<'cambios' | 'accesos'>('cambios');
  const [responsable, setResponsable] = useState('');
  const [accion, setAccion] = useState('');
  const [filtrosVisibles, setFiltrosVisibles] = useState(true);
  const [descargando, setDescargando] = useState(false);

  // Cerrar con Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cambiosQuery = useQuery<MovimientoCambio[]>({
    queryKey: ['auditoria-cambios', modulo, responsable, accion],
    queryFn: () =>
      api
        .get('/auditoria/cambios', {
          params: {
            modulo,
            responsable: responsable || undefined,
            accion: accion || undefined,
          },
        })
        .then((r) => r.data),
    enabled: tab === 'cambios',
  });

  const accesosQuery = useQuery<Acceso[]>({
    queryKey: ['auditoria-accesos'],
    queryFn: () => api.get('/auditoria/accesos').then((r) => r.data),
    enabled: tab === 'accesos',
  });

  const descargarPdf = async () => {
    setDescargando(true);
    try {
      const res = await api.get('/auditoria/cambios/pdf', {
        params: {
          modulo,
          responsable: responsable || undefined,
          accion: accion || undefined,
        },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria-${modulo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar el PDF');
    } finally {
      setDescargando(false);
    }
  };

  const cambios = cambiosQuery.data ?? [];
  const accesos = accesosQuery.data ?? [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="bg-surface-raised border border-surface-border rounded-xl w-full max-w-3xl mx-4 shadow-lg animate-slide-up flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="min-w-0">
            <h2 className="modal-title">Auditoría — {moduloLabel}</h2>
            <p className="text-xs text-carbon-400 mt-0.5">
              Historial de cambios y accesos al sistema
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-carbon-400 hover:text-carbon-50 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border w-fit mx-6 mt-4">
          <button
            onClick={() => setTab('cambios')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${
              tab === 'cambios'
                ? 'bg-surface-raised text-carbon-50 shadow-sm'
                : 'text-carbon-400 hover:text-carbon-200'
            }`}
          >
            Cambios
          </button>
          <button
            onClick={() => setTab('accesos')}
            className={`px-4 py-1.5 text-sm font-medium rounded-sm transition-colors ${
              tab === 'accesos'
                ? 'bg-surface-raised text-carbon-50 shadow-sm'
                : 'text-carbon-400 hover:text-carbon-200'
            }`}
          >
            Accesos al sistema
          </button>
        </div>

        {/* Contenido */}
        <div className="px-6 py-4 overflow-y-auto">
          {tab === 'cambios' ? (
            <div className="space-y-3">
              {/* Barra de acciones */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <button
                  onClick={() => setFiltrosVisibles((v) => !v)}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  {filtrosVisibles ? (
                    <>
                      <FilterX className="w-4 h-4" />
                      Ocultar filtros
                    </>
                  ) : (
                    <>
                      <Filter className="w-4 h-4" />
                      Mostrar filtros
                    </>
                  )}
                </button>
                <button
                  onClick={descargarPdf}
                  disabled={descargando}
                  className="btn-ghost text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {descargando ? 'Generando…' : 'PDF'}
                </button>
              </div>

              {/* Filtros */}
              {filtrosVisibles && (
                <div className="flex flex-wrap gap-3 bg-surface-overlay border border-surface-border rounded-lg p-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">
                      Responsable
                    </label>
                    <input
                      type="text"
                      className="input-field text-xs w-48"
                      value={responsable}
                      onChange={(e) => setResponsable(e.target.value)}
                      placeholder="Nombre del responsable"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-medium text-carbon-400 uppercase tracking-wider">
                      Acción
                    </label>
                    <select
                      className="input-field text-xs w-56"
                      value={accion}
                      onChange={(e) => setAccion(e.target.value)}
                    >
                      <option value="">Todas</option>
                      {ACCIONES.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Tabla de cambios */}
              <Table compact>
                <Thead>
                  <Th>Fecha</Th>
                  <Th>Responsable</Th>
                  <Th>Acción</Th>
                  <Th>Campo</Th>
                  <Th>Anterior</Th>
                  <Th>Nuevo</Th>
                </Thead>
                <Tbody>
                  {cambiosQuery.isLoading ? (
                    <TrSkeleton cols={6} />
                  ) : cambios.length === 0 ? (
                    <TdEmpty colSpan={6} message="No hay movimientos registrados para este módulo." />
                  ) : (
                    cambios.map((m) => (
                      <Tr key={m.id}>
                        <Td className="whitespace-nowrap text-carbon-300 font-mono text-xs">
                          {formatFecha(m.fecha)}
                        </Td>
                        <Td className="whitespace-nowrap text-carbon-100">{m.responsable}</Td>
                        <Td className="whitespace-nowrap text-carbon-200">{m.accion}</Td>
                        <Td className="whitespace-nowrap text-carbon-300 text-xs">
                          {m.campo ?? <span className="text-carbon-600">—</span>}
                        </Td>
                        <Td className="text-carbon-400 text-xs">
                          {m.valorAnterior ?? <span className="text-carbon-600">—</span>}
                        </Td>
                        <Td className="text-carbon-100 text-xs">
                          {m.valorNuevo ?? <span className="text-carbon-600">—</span>}
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </div>
          ) : (
            <Table compact>
              <Thead>
                <Th>Responsable</Th>
                <Th>Fecha y hora</Th>
              </Thead>
              <Tbody>
                {accesosQuery.isLoading ? (
                  <TrSkeleton cols={2} />
                ) : accesos.length === 0 ? (
                  <TdEmpty colSpan={2} message="No hay accesos registrados." />
                ) : (
                  accesos.map((a, i) => (
                    <Tr key={`${a.responsable}-${a.fecha}-${i}`}>
                      <Td className="whitespace-nowrap text-carbon-100">{a.responsable}</Td>
                      <Td className="whitespace-nowrap text-carbon-300 font-mono text-xs">
                        {formatFecha(a.fecha)}
                      </Td>
                    </Tr>
                  ))
                )}
              </Tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
