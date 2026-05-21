'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, Menu, UserCircle, X, type LucideIcon } from 'lucide-react';

export type AppShellNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

type Props = {
  roleLabel: string;
  navItems: AppShellNavItem[];
  profileHref: string;
  email?: string | null;
  contextLine?: string | null;
  children: React.ReactNode;
};

export function AppShell({
  roleLabel,
  navItems,
  profileHref,
  email,
  contextLine,
  children,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const navLinkClass = (href: string) =>
    pathname.startsWith(href) ? 'nav-link-active' : 'nav-link';

  return (
    <div className="flex min-h-screen">
      {/* Topbar — visible only en < lg */}
      <header
        className="fixed top-0 inset-x-0 z-30 h-14 bg-verde-600 text-white flex items-center justify-between px-4 lg:hidden shadow-sm"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={open}
          aria-controls="app-sidebar"
          className="inline-flex items-center justify-center w-10 h-10 rounded-md hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
        >
          <Menu className="w-5 h-5" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-2">
          <Image
            src="/logo.webp"
            alt="Valleflor"
            width={100}
            height={28}
            className="object-contain"
            priority
          />
        </div>
        <span className="text-[10px] font-medium text-white/80 uppercase tracking-widest">
          {roleLabel}
        </span>
      </header>

      {/* Overlay del drawer */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Drawer */}
      <aside
        id="app-sidebar"
        className={[
          'fixed top-0 left-0 h-full w-64 lg:w-56 bg-surface-raised border-r border-surface-border z-50 flex flex-col',
          'transition-transform duration-200 ease-out',
          'lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        aria-label="Navegación principal"
      >
        <div className="px-5 py-4 border-b border-surface-border bg-verde-600 flex items-center justify-between gap-2">
          <div className="flex flex-col items-start gap-1">
            <Image
              src="/logo.webp"
              alt="Valleflor"
              width={140}
              height={40}
              className="object-contain"
              priority
            />
            <span className="text-[10px] font-medium text-white/70 uppercase tracking-widest">
              {roleLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
              <item.Icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-surface-border">
          <div className="px-3 py-2 mb-1 flex flex-col gap-0.5">
            {contextLine && (
              <p className="text-xs font-medium text-carbon-50 truncate">{contextLine}</p>
            )}
            {email && <p className="text-[10px] text-carbon-400 truncate">{email}</p>}
          </div>
          <Link href={profileHref} className={navLinkClass(profileHref)}>
            <UserCircle className="w-4 h-4" />
            Mi perfil
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
            className="nav-link w-full text-left mt-1"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 lg:ml-56 px-4 lg:px-8 pb-6 lg:pb-8 pt-[calc(env(safe-area-inset-top)+5rem)] lg:pt-8 animate-fade-in min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
