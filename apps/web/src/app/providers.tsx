'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { ReactQueryProvider } from '@/lib/queryClient';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ReactQueryProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#21262d',
              color: '#e6edf3',
              border: '1px solid #30363d',
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0d1117' } },
            error: { iconTheme: { primary: '#f87171', secondary: '#0d1117' } },
          }}
        />
      </ReactQueryProvider>
    </SessionProvider>
  );
}
