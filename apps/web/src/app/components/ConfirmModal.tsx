'use client';

import { X, AlertTriangle } from 'lucide-react';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  isPending?: boolean;
}

export function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = 'Eliminar', isPending }: Props) {
  return (
    <div className="modal-overlay">
      <div className="bg-surface-raised border border-surface-border rounded-xl w-full max-w-sm mx-4 shadow-lg animate-slide-up">
        <div className="flex items-start gap-4 p-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-carbon-50 leading-snug">{message}</p>
            <p className="text-xs text-carbon-400 mt-1">Esta acción no se puede deshacer.</p>
          </div>
          <button onClick={onCancel} className="flex-shrink-0 text-carbon-400 hover:text-carbon-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} className="btn-ghost flex-1 justify-center">Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 justify-center inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
