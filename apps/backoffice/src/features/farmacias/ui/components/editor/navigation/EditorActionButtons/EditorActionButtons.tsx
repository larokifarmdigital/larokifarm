'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { publishFarmaciaAction } from '@/features/farmacias/actions/farmaciaActions';
import { useI18nHealth } from '@/features/farmacias/ui/hooks/useI18nHealth';
import { localeWithMostMissing } from '@/features/farmacias/ui/lib/i18nStatus';
import { cn } from '@/shared/lib/cn';
import { PublishMissingDialog } from './PublishMissingDialog';

/**
 * Trío de acciones del editor (Ver preview · Ver landing · Publicar cambios).
 * Se usa tanto en el TopBar (desktop) como en la barra móvil bottom.
 *
 * `compact` activa el modo bottom-bar: los 3 botones ocupan flex-1 por igual.
 *
 * Si hay traducciones pendientes, "Publicar" abre antes PublishMissingDialog
 * (confirmar, no bloquear).
 */
export function EditorActionButtons({ compact = false }: { compact?: boolean }) {
  const { farmacia, saveNow, dirty, goToSection } = useFarmaciaEditor();
  const health = useI18nHealth();
  const [pending, startTx] = useTransition();
  const [warnOpen, setWarnOpen] = useState(false);

  const doPublish = () => {
    // NOTE: se captura antes del await — el contenido no cambia al guardar.
    const remaining = health.totalMissing;
    startTx(async () => {
      try {
        if (dirty) await saveNow();
        await publishFarmaciaAction(farmacia.id, true);
      } catch {
        toast.error('No se pudo publicar. Vuelve a intentarlo.');
        return;
      }
      setWarnOpen(false);
      toast.success(
        remaining === 0
          ? 'Cambios publicados en la landing'
          : `Publicado. ${remaining === 1 ? 'Queda 1 texto' : `Quedan ${remaining} textos`} por traducir.`,
      );
    });
  };

  const publish = () => {
    if (health.totalMissing > 0) setWarnOpen(true);
    else doPublish();
  };

  const review = (sectionKey?: string) => {
    const sec =
      health.sectionsWithMissing.find((s) => s.key === sectionKey) ?? health.sectionsWithMissing[0];
    setWarnOpen(false);
    if (sec) goToSection(sec.key, localeWithMostMissing(sec));
  };

  const publishLabel = farmacia.status === 'published' ? 'Publicar cambios' : 'Publicar';

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 sm:gap-2 shrink-0',
        compact && 'w-full',
      )}
    >
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <span className={cn('inline-block', compact && 'flex-1')}>
            <Button
              variant="secondary"
              size="sm"
              disabled
              aria-label="Ver preview (se activará en Fase 5)"
              className={cn(compact && 'w-full justify-center')}
            >
              <NavIcon name="ArrowSquareOut" size={13} />
              <span className={cn(compact ? 'inline' : 'hidden md:inline')}>Preview</span>
            </Button>
          </span>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={6}
            className="max-w-[240px] bg-[var(--color-ink)] text-[var(--color-surface)] text-[12px] leading-[1.45] px-2.5 py-1.5 rounded-[6px] shadow-[var(--shadow-elevated)]"
          >
            Vista previa en vivo — se conecta en Fase 5.
            <Tooltip.Arrow className="fill-[var(--color-ink)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          window.open(`https://larokifarm.com/${farmacia.slug}`, '_blank', 'noopener,noreferrer')
        }
        aria-label="Abrir la landing publicada en nueva pestaña"
        className={cn(compact && 'flex-1 justify-center')}
      >
        <span className={cn(compact ? 'inline' : 'hidden sm:inline')}>Landing</span>
        <NavIcon name="ArrowSquareOut" size={12} />
      </Button>

      <Button
        variant="accent"
        size="sm"
        onClick={publish}
        disabled={pending}
        aria-label={publishLabel}
        className={cn(compact && 'flex-[1.4] justify-center')}
      >
        <NavIcon name="Check" size={13} />
        <span className={cn(compact ? 'inline' : 'hidden sm:inline')}>
          {pending ? 'Publicando…' : publishLabel}
        </span>
        {!compact && (
          <span className="sm:hidden">{pending ? '…' : 'Publicar'}</span>
        )}
      </Button>

      <PublishMissingDialog
        open={warnOpen}
        onOpenChange={setWarnOpen}
        summary={health}
        publishing={pending}
        onPublish={doPublish}
        onReview={review}
      />
    </div>
  );
}
