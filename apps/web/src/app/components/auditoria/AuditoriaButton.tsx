'use client';

import { useState } from 'react';
import { History } from 'lucide-react';
import { AuditoriaModal, type ModuloAuditoria } from './AuditoriaModal';

interface Props {
  modulo: ModuloAuditoria;
  moduloLabel: string;
  className?: string;
}

/**
 * Botón "Auditoría" para la cabecera de un módulo admin. Encapsula el estado del
 * modal para no obligar a la página contenedora a ser cliente.
 */
export function AuditoriaButton({ modulo, moduloLabel, className = '' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={`btn-ghost ${className}`}>
        <History className="w-4 h-4" />
        Auditoría
      </button>
      {open && (
        <AuditoriaModal modulo={modulo} moduloLabel={moduloLabel} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
