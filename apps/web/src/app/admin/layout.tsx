'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MapPin, Users, BookOpen, BarChart2, PieChart } from 'lucide-react';
import { AppShell, type AppShellNavItem } from '../components/AppShell';

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-verde-600 border-t-transparent rounded-full animate-spin-fast" aria-label="Cargando" />
    </div>
  );
}

const navItems: AppShellNavItem[] = [
  { href: '/admin/fincas', label: 'Fincas', Icon: MapPin },
  { href: '/admin/usuarios', label: 'Usuarios', Icon: Users },
  { href: '/admin/catalogo', label: 'Catálogo', Icon: BookOpen },
  { href: '/admin/consolidado', label: 'Consolidado', Icon: BarChart2 },
  { href: '/admin/participacion', label: 'Participación', Icon: PieChart },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/auth/login'); return; }
    if ((session.user as any)?.role !== 'admin') router.push('/responsable/estimaciones');
  }, [session, status, router]);

  if (status === 'loading' || !session) return <Spinner />;

  return (
    <AppShell
      roleLabel="Admin"
      navItems={navItems}
      profileHref="/admin/perfil"
      email={session.user?.email}
    >
      {children}
    </AppShell>
  );
}
