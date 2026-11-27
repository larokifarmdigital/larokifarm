'use client';

import { EditorActionButtons } from '@/features/farmacias/ui/components/editor/navigation/EditorActionButtons';
import { PublicacionEstado } from '@/features/farmacias/ui/components/editor/status/PublicacionEstado';
import { useVistaPrevia } from '@/features/farmacias/ui/context/VistaPreviaContext';
import { NavIcon } from '@/shared/components/atoms/NavIcon';

export function EditorMobileActionBar() {
  const vistaPrevia = useVistaPrevia();
  return (
    <div
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-surface)]/95 backdrop-blur border-t border-[var(--color-hairline)]"
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      <div className="px-3 pt-2 pb-[max(env(safe-area-inset-bottom),8px)] flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <PublicacionEstado compacto />
        </div>
        {vistaPrevia.disponible && (
          <button
            type="button"
            onClick={vistaPrevia.abrir}
            data-abrir-vista-previa=""
            aria-label="Vista previa"
            title="Vista previa"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-[var(--color-hairline-strong)] bg-[var(--color-surface)] text-[var(--color-ink-2)]"
          >
            <NavIcon name="Eye" size={18} />
          </button>
        )}
        <div className="w-[52%] shrink-0 flex">
          <EditorActionButtons compact />
        </div>
      </div>
    </div>
  );
}
