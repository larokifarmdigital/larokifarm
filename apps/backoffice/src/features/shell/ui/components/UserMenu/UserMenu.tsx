'use client';

import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { signOut } from 'next-auth/react';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { ROL_LABEL } from '@/features/shell/ui/lib/navConfig';
import type { ShellInfo } from '@/features/shell/ui/lib/shellInfo';
import { landingUrl } from '@/shared/lib/landingUrl';
import { useAyuda } from '../AyudaProvider';
import { CambiarContrasenaDialog } from '../CambiarContrasenaDialog';

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const ITEM =
  'flex items-center gap-2.5 min-h-11 sm:min-h-10 px-2.5 rounded-[6px] text-[14px] text-[var(--color-ink-2)] outline-none cursor-pointer data-[highlighted]:bg-[var(--color-surface-2)] data-[highlighted]:text-[var(--color-ink)]';

export function UserMenu({ shell }: { shell: ShellInfo }) {
  const miWeb = shell.miFarmacia ? landingUrl(shell.miFarmacia.web) : undefined;
  const ayuda = useAyuda();
  const [cambiarClave, setCambiarClave] = useState(false);

  return (
    <>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Menú de usuario, sesión abierta como ${shell.nombre}`}
        className="flex items-center gap-2 h-11 pl-1 pr-2 rounded-[8px] hover:bg-[var(--color-surface-sunken)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      >
        <span
          aria-hidden
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-white text-[12px] font-semibold"
        >
          {initials(shell.nombre)}
        </span>
        <NavIcon name="CaretDown" size={12} className="text-[var(--color-muted)]" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={8}
          align="end"
          className="w-[260px] bg-[var(--color-surface)] border border-[var(--color-hairline)] rounded-[10px] shadow-[var(--shadow-elevated)] p-1.5 outline-none z-50 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="px-2.5 py-2.5">
            <div className="text-[14px] font-semibold text-[var(--color-ink)] truncate">{shell.nombre}</div>
            <div className="text-[12.5px] text-[var(--color-muted)] truncate">{shell.email}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="chip chip-neutral">{ROL_LABEL[shell.rol]}</span>
              {(shell.miFarmacia || shell.misFarmacias?.length) && (
                <span className="text-[12.5px] text-[var(--color-ink-2)] truncate">
                  {shell.miFarmacia?.nombre ?? shell.misFarmacias?.join(', ')}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu.Separator className="h-px bg-[var(--color-hairline)] my-1" />

          <DropdownMenu.Item className={ITEM} onSelect={() => setCambiarClave(true)}>
            <NavIcon name="User" size={15} className="text-[var(--color-muted)]" />
            Cambiar mi contraseña
          </DropdownMenu.Item>

          {miWeb && (
            <DropdownMenu.Item asChild className={ITEM}>
              <a href={miWeb} target="_blank" rel="noopener noreferrer">
                <NavIcon name="ArrowSquareOut" size={15} className="text-[var(--color-muted)]" />
                Ver mi web
              </a>
            </DropdownMenu.Item>
          )}
          {ayuda.disponible && (
            <DropdownMenu.Item className={ITEM} onSelect={ayuda.abrir}>
              <NavIcon name="Question" size={15} className="text-[var(--color-muted)]" />
              Ayuda y soporte
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Separator className="h-px bg-[var(--color-hairline)] my-1" />
          <DropdownMenu.Item
            onSelect={(e) => {
              // preventDefault: que Radix no cierre el menú antes de que signOut
              // (con CSRF) limpie la cookie y redirija a /login.
              e.preventDefault();
              void signOut({ callbackUrl: '/login' });
            }}
            className="flex items-center gap-2.5 min-h-11 sm:min-h-10 px-2.5 rounded-[6px] text-[14px] text-[var(--color-red-ink)] outline-none cursor-pointer data-[highlighted]:bg-[var(--color-red-soft)]"
          >
            <NavIcon name="SignOut" size={15} />
            Cerrar sesión
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    <CambiarContrasenaDialog open={cambiarClave} onOpenChange={setCambiarClave} />
    </>
  );
}
