'use client';

import Image from 'next/image';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md flex flex-col items-center text-center gap-6">
        <Image
          src="/logo.svg"
          alt="Valleflor"
          width={160}
          height={120}
          priority
          className="object-contain invert"
        />

        <div className="w-16 h-16 rounded-full bg-verde-50 flex items-center justify-center">
          <WifiOff className="w-8 h-8 text-verde-600" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-carbon-50">Sin conexión</h1>
          <p className="text-sm text-carbon-300">
            No detectamos conexión a internet. Revisa tu red e inténtalo de nuevo.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-verde-600 text-white text-sm font-medium hover:bg-verde-700 focus:outline-none focus:ring-2 focus:ring-verde-600 focus:ring-offset-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Reintentar
        </button>
      </div>
    </main>
  );
}
