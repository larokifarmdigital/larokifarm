'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Role } from '@/core/shared';
import { roleLabel } from '@/features/admin/lib/roleLabel';
import { logoutAction } from '@/features/auth';
import { BrandMark } from '@/shared/components/atoms/BrandMark';
import { UserAvatar } from '@/shared/components/atoms/UserAvatar';

export interface NavItem {
  href: string;
  label: string;
}

interface HeaderClientProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
  navItems: NavItem[];
}

export function HeaderClient({ user, navItems }: HeaderClientProps) {
  const pathname = usePathname();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    function onDown(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [userMenuOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onDown(e: MouseEvent) {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <BrandMark size={32} />
          <span className="text-base font-semibold tracking-tight text-slate-900">
            Conciliador
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>

        {/* User menu desktop */}
        <div className="relative hidden md:block" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm hover:border-slate-300"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
          >
            <UserAvatar seed={user.email} name={user.name} />
            <span className="max-w-[140px] truncate text-sm font-medium text-slate-800">
              {firstName(user.name)}
            </span>
            <BrandBadge>{roleLabel(user.role, { short: true })}</BrandBadge>
            <ChevronIcon open={userMenuOpen} />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
            >
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <UserAvatar seed={user.email} name={user.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                  role="menuitem"
                >
                  <LogoutIcon />
                  Cerrar sesión
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Botón hamburguesa móvil */}
        <div className="md:hidden" ref={mobileMenuRef}>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Menú móvil desplegado desde el hamburger */}
      {mobileOpen && (
        <div
          className="absolute inset-x-3 top-full mt-2 origin-top overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl md:hidden"
          role="menu"
        >
          {/* Cabecera usuario: badge de rol como esquina, no debajo del email */}
          <div className="relative border-b border-slate-100 bg-slate-50 px-4 py-4">
            <div className="absolute right-3 top-3">
              <BrandBadge>{roleLabel(user.role, { short: true })}</BrandBadge>
            </div>
            <div className="flex items-center gap-3 pr-24">
              <UserAvatar seed={user.email} name={user.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Nav como lista de navegación con icono + chevron */}
          <nav className="p-2">
            <p className="mb-1 px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Navegación
            </p>
            {navItems.map((item) => (
              <MobileNavLink
                key={item.href}
                item={item}
                pathname={pathname}
              />
            ))}
          </nav>

          {/* Logout */}
          <form action={logoutAction} className="border-t border-slate-100 p-3">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              <LogoutIcon />
              Cerrar sesión
            </button>
          </form>
        </div>
      )}
    </header>
  );
}

/* --------------------------------- Sub UI --------------------------------- */

function NavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string | null;
}) {
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? '' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
      style={
        active
          ? {
              background: 'var(--brand-primary-soft)',
              color: 'var(--brand-accent)',
            }
          : undefined
      }
    >
      {item.label}
    </Link>
  );
}

function MobileNavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string | null;
}) {
  const active = isActive(pathname, item.href);
  const Icon = iconForRoute(item.href);
  return (
    <Link
      href={item.href}
      className={`flex items-center justify-between gap-3 rounded-md px-3 py-3 text-sm font-medium ${
        active ? '' : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
      }`}
      style={
        active
          ? {
              background: 'var(--brand-primary-soft)',
              color: 'var(--brand-accent)',
            }
          : undefined
      }
    >
      <span className="flex items-center gap-3">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
            active ? 'bg-white/60' : 'bg-slate-100 text-slate-500'
          }`}
          style={
            active
              ? {
                  color: 'var(--brand-accent)',
                }
              : undefined
          }
        >
          <Icon />
        </span>
        {item.label}
      </span>
      <ChevronRightIcon />
    </Link>
  );
}

function BrandBadge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
      style={{
        background: 'var(--brand-primary-soft)',
        color: 'var(--brand-accent)',
        ['--tw-ring-color' as string]: 'var(--brand-primary-ring)',
      }}
    >
      {children}
    </span>
  );
}

/* --------------------------------- Helpers -------------------------------- */

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}

function iconForRoute(href: string): () => React.ReactElement {
  if (href === '/') return ReconcileIcon;
  if (href.startsWith('/historial')) return HistoryIcon;
  if (href.startsWith('/admin/usuarios')) return UsersIcon;
  if (href.startsWith('/admin/negocios')) return BuildingIcon;
  if (href.startsWith('/admin/uso')) return ChartIcon;
  return DotIcon;
}

/* --------------------------------- Icons ---------------------------------- */

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-slate-400"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" x2="20" y1="6" y2="6" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

function ReconcileIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 3 21 7 17 11" />
      <path d="M21 7H9a4 4 0 0 0-4 4v0" />
      <path d="m7 21-4-4 4-4" />
      <path d="M3 17h12a4 4 0 0 0 4-4v0" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="16" height="20" x="4" y="2" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 3v18h18" />
      <path d="M7 16V9" />
      <path d="M12 16v-5" />
      <path d="M17 16V6" />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
