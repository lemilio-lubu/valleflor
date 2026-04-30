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
              background: '#FFFFFF',
              color: '#101828',
              border: '1px solid #E4E7EC',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.875rem',
              boxShadow: '0 4px 8px rgba(16,24,40,0.08)',
            },
            success: { iconTheme: { primary: '#2E8B3D', secondary: '#ECFDF3' } },
            error: { iconTheme: { primary: '#D32F2F', secondary: '#FEF3F2' } },
          }}
        />
      </ReactQueryProvider>
    </SessionProvider>
  );
}
