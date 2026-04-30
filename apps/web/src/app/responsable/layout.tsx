'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

function Spinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-verde-600 border-t-transparent rounded-full animate-spin" />
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

  const navItems = [
    { href: '/responsable/datos', label: 'Datos', icon: '📋' },
    { href: '/responsable/estimaciones', label: 'Estimaciones', icon: '📊' },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-surface-raised border-r border-surface-border flex flex-col fixed h-full z-10">
        <div className="px-5 py-6 border-b border-surface-border">
          <h1 className="font-serif text-xl text-carbon-50">Villaflor</h1>
          <p className="text-[10px] font-mono text-dorado-400 uppercase tracking-widest mt-0.5">Responsable</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname.startsWith(item.href) ? 'nav-link-active' : 'nav-link'}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-surface-border">
          <div className="px-3 py-2 mb-1 flex flex-col gap-0.5">
            <p className="text-xs font-medium text-carbon-200 truncate">
              {(session.user as any)?.fincaNombre ? `Finca ${(session.user as any).fincaNombre}` : 'Sin Finca'}
            </p>
            <p className="text-[10px] text-carbon-400 truncate">{session.user?.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="nav-link w-full text-left"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
            </svg>
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
