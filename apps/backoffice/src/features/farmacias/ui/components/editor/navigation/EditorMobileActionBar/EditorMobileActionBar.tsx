'use client';

import { EditorActionButtons } from '@/features/farmacias/ui/components/editor/navigation/EditorActionButtons';
import { PublicacionEstado } from '@/features/farmacias/ui/components/editor/status/PublicacionEstado';

/**
 * Barra inferior fija en móvil (<sm): estado de la web a la izquierda y una
 * sola acción de 44 px a la derecha (Publicar si hay cambios; si no, Ver mi web).
 */
export function EditorMobileActionBar() {
  return (
    <div
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur border-t border-[var(--color-hairline)]"
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      <div className="px-3 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <PublicacionEstado compacto />
        </div>
        <div className="w-[52%] shrink-0 flex">
          <EditorActionButtons compact />
        </div>
      </div>
    </div>
  );
}
