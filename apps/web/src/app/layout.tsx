import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Villaflor — Estimaciones',
  description: 'Sistema de gestión y estimaciones para floricultura',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="font-sans bg-surface text-carbon-50 antialiased min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
