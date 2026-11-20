'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/atoms/Button';
import { IconoSVG } from '@/shared/components/atoms/IconoSVG';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { IconPicker } from '@/shared/components/molecules/IconPicker';
import { ICONOS_CATALOGO, type IconoNombre } from '@/shared/lib/iconCatalog';

/**
 * Icono en formato compacto ("[icono] Bebé (cuidado infantil) · Cambiar"):
 * el catálogo (~450 px) solo se abre al pulsar "Cambiar", para que el nombre
 * y la descripción sean lo primero que se ve en el modal.
 */
export function IconoField({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (icono: IconoNombre | undefined) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const nombre = value ? ICONOS_CATALOGO.find((i) => i.value === value)?.label ?? 'Icono' : 'Sin icono';
  return (
    <div>
      <p className="label m-0">Icono</p>
      <div className="mt-1.5 flex items-center gap-3">
        <span className="h-11 w-11 shrink-0 rounded-[8px] bg-[var(--color-accent-soft)] text-[var(--color-accent)] flex items-center justify-center">
          {value ? <IconoSVG nombre={value} size={20} /> : <NavIcon name="Image" size={16} />}
        </span>
        <span className="flex-1 min-w-0 text-[14px] text-[var(--color-ink-2)]">{nombre}</span>
        <Button type="button" variant="secondary" size="sm" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}>
          {abierto ? 'Cerrar' : 'Cambiar'}
        </Button>
      </div>
      {abierto && (
        <div className="mt-3">
          <IconPicker
            value={value}
            onChange={(icono) => {
              onChange(icono);
              setAbierto(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
