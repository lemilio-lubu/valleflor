'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { BarChart2 } from 'lucide-react';
import { AppShell, type AppShellNavItem } from '../components/AppShell';

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-verde-600 border-t-transparent rounded-full animate-spin" aria-label="Cargando" />
    </div>
  );
}

const navItems: AppShellNavItem[] = [
  { href: '/responsable/estimaciones', label: 'Estimaciones', Icon: BarChart2 },
];

export default function ResponsableLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const refreshed = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/auth/login'); return; }
    if ((session.user as any)?.role !== 'responsable') router.push('/admin/fincas');
  }, [session, status, router]);

  // Refrescar el JWT una vez al montar para garantizar que finca y nombre
  // reflejan la asignación actual, incluso si el admin cambió la finca
  // mientras el responsable tenía la sesión abierta.
  useEffect(() => {
    if (session && !refreshed.current) {
      refreshed.current = true;
      update();
    }
  }, [session, update]);

  if (status === 'loading' || !session) return <Spinner />;

  const fincaNombre = (session?.user as any)?.fincaNombre;
  const contextLine = fincaNombre ? `Finca ${fincaNombre}` : 'Sin Finca';

  return (
    <AppShell
      roleLabel="Responsable"
      navItems={navItems}
      profileHref="/responsable/perfil"
      email={session.user?.email}
      contextLine={contextLine}
    >
      {children}
    </AppShell>
  );
}
