'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Primitivo de diálogo sobre Radix. Aporta gratis: focus-trap, cierre con Esc,
 * scroll-lock del body y ARIA. Las animaciones de entrada/salida (centradas,
 * con scale) viven en globals.css vía los selectores [data-state].
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

interface DialogContentProps {
  children: ReactNode;
  /** Clases extra para el contenedor (p. ej. ancho máximo). */
  className?: string;
  /** Muestra la X de cierre arriba a la derecha. */
  showClose?: boolean;
}

export function DialogContent({
  children,
  className = 'max-w-sm',
  showClose = true,
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-50 bg-[rgba(16,24,40,0.5)]" />
      <DialogPrimitive.Content
        className={`dialog-content fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] bg-surface-raised border border-surface-border rounded-xl shadow-lg outline-none ${className}`}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            aria-label="Cerrar"
            className="absolute right-4 top-4 text-carbon-400 hover:text-carbon-50 transition-colors duration-150 ease-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-verde-600 rounded-sm"
          >
            <X className="w-4 h-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
