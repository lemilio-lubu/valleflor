'use client';

import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './Dialog';

interface Props {
  message: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  pendingLabel?: string;
  isPending?: boolean;
}

export function ConfirmModal({
  message,
  description = 'Esta acción no se puede deshacer.',
  onConfirm,
  onCancel,
  confirmLabel = 'Eliminar',
  pendingLabel,
  isPending,
}: Props) {
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="max-w-sm">
        <div className="flex items-start gap-4 p-6 pr-12">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-sm font-medium text-carbon-50 leading-snug">
              {message}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-xs text-carbon-400 mt-1">
                {description}
              </DialogDescription>
            )}
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} className="btn-ghost flex-1 justify-center">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-danger flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (pendingLabel ?? `${confirmLabel}...`) : confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
