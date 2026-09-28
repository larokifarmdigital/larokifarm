'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { signOut } from 'next-auth/react';
import { NavIcon } from './NavIcon';
import type { Usuario } from '@/types/content';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserMenu({ user }: { user: Usuario }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Menú de usuario, sesión abierta como ${user.nombre}`}
        className="flex items-center gap-2 h-9 pl-1 pr-2 rounded-[6px] hover:bg-[var(--color-surface-sunken)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <span
          aria-hidden
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-white text-[11px] font-semibold"
        >
          {initials(user.nombre)}
        </span>
        <NavIcon name="CaretDown" size={11} className="text-[var(--color-muted)]" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          className="min-w-[220px] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[8px] shadow-[var(--shadow-elevated)] p-1.5 outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="px-2.5 py-2">
            <div className="text-[13px] font-medium text-[var(--color-ink)] truncate">
              {user.nombre}
            </div>
            <div className="text-[11.5px] text-[var(--color-muted)] truncate">
              {user.email}
            </div>
            <div className="mt-1.5 chip chip-neutral">{user.rol}</div>
          </div>
          <DropdownMenu.Separator className="h-px bg-[var(--color-hairline)] my-1" />
          <DropdownMenu.Item className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none cursor-pointer">
            <NavIcon name="User" size={13} />
            Mi perfil
          </DropdownMenu.Item>
          <DropdownMenu.Item className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] outline-none cursor-pointer">
            <NavIcon name="GearSix" size={13} />
            Preferencias
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="h-px bg-[var(--color-hairline)] my-1" />
          <DropdownMenu.Item
            onSelect={(e) => {
              // NOTE: preventDefault evita que Radix cierre el menú antes de
              // que dispare signOut. signOut cliente-side llama a /api/auth/signout
              // con CSRF, limpia la cookie de sesión y redirige a /login.
              e.preventDefault();
              void signOut({ callbackUrl: '/login' });
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[13px] text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)] outline-none cursor-pointer"
          >
            <NavIcon name="SignOut" size={13} />
            Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
