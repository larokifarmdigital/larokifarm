'use client';

import type { ReactNode } from 'react';

/**
 * Botón para cambiar el idioma que se VE. En solo consulta el editor va dentro
 * de un <fieldset disabled> y cualquier <button> queda desactivado; cambiar de
 * idioma no escribe nada, así que debe seguir funcionando: en ese caso se pinta
 * como div role=button (con teclado), que el fieldset no desactiva.
 */
export function BotonIdioma({
  pulsado,
  onPulsar,
  enFieldsetDesactivado,
  className,
  children,
}: {
  pulsado: boolean;
  onPulsar: () => void;
  enFieldsetDesactivado: boolean;
  className: string;
  children: ReactNode;
}) {
  if (!enFieldsetDesactivado) {
    return (
      <button type="button" aria-pressed={pulsado} onClick={onPulsar} className={className}>
        {children}
      </button>
    );
  }
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={pulsado}
      onClick={onPulsar}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPulsar();
        }
      }}
      className={`${className} cursor-pointer`}
    >
      {children}
    </div>
  );
}
