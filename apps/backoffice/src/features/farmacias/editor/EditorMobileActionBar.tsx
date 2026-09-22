'use client';

import { EditorActionButtons } from './EditorActionButtons';
import { EditorHealthChip } from './EditorHealthChip';

/**
 * Barra de acciones sticky en la parte inferior, visible solo en móvil (<sm).
 * Se coloca debajo del pill flotante de navegación (que en móvil se ve encima).
 * Contiene el chip de estado (Al día / Sin guardar / Incompleto) y los 3
 * botones Preview / Landing / Publicar.
 */
export function EditorMobileActionBar() {
  return (
    <div
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-bg)]/95 backdrop-blur border-t border-[var(--color-hairline)]"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
    >
      <div className="px-3 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] flex items-center gap-2">
        <EditorHealthChip align="start" />
        <div className="flex-1 min-w-0">
          <EditorActionButtons compact />
        </div>
      </div>
    </div>
  );
}
