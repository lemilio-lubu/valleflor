'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, BarChart2, UserCircle, type LucideIcon } from 'lucide-react';

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-verde-600 border-t-transparent rounded-full animate-spin" aria-label="Cargando" />
    </div>
  );
}

export default function ResponsableLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/auth/login'); return; }
    if ((session.user as any)?.role !== 'responsable') router.push('/admin/fincas');
  }, [session, status, router]);

  if (status === 'loading' || !session) return <Spinner />;

  const navItems: { href: string; label: string; Icon: LucideIcon }[] = [
    { href: '/responsable/estimaciones', label: 'Estimaciones', Icon: BarChart2 },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-surface-raised border-r border-surface-border flex flex-col fixed h-full z-10">
        <div className="px-5 py-4 border-b border-surface-border bg-verde-600 flex flex-col items-start gap-2">
          <Image src="/logo.webp" alt="Valleflor" width={140} height={40} className="object-contain" priority />
          <span className="text-[10px] font-medium text-white/70 uppercase tracking-widest">Responsable</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname.startsWith(item.href) ? 'nav-link-active' : 'nav-link'}
            >
              <item.Icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-surface-border">
          <div className="px-3 py-2 mb-1 flex flex-col gap-0.5">
            <p className="text-xs font-medium text-carbon-50 truncate">
              {(session.user as any)?.fincaNombre ? `Finca ${(session.user as any).fincaNombre}` : 'Sin Finca'}
            </p>
            <p className="text-[10px] text-carbon-400 truncate">{session.user?.email}</p>
          </div>
          <Link
            href="/responsable/perfil"
            className={pathname.startsWith('/responsable/perfil') ? 'nav-link-active' : 'nav-link'}
          >
            <UserCircle className="w-4 h-4" />
            Mi perfil
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="nav-link w-full text-left mt-1"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
      {/* Main content */}
      <main className="flex-1 ml-56 p-8 animate-fade-in">
        {children}
      </main>
    </div>
  );
}
