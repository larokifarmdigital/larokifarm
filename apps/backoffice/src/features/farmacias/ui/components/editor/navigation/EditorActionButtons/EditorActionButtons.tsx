'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { publishFarmaciaAction } from '@/features/farmacias/actions/farmaciaActions';
import { useI18nHealth } from '@/features/farmacias/ui/hooks/useI18nHealth';
import { localeWithMostMissing } from '@/features/farmacias/ui/lib/i18nStatus';
import { publishToast } from '@/features/farmacias/ui/lib/publishToast';
import { cn } from '@/shared/lib/cn';
import { landingUrl } from '@/shared/lib/landingUrl';
import { PublishMissingDialog } from './PublishMissingDialog';
import { PublishBlockedDialog } from './PublishBlockedDialog';
import type { FieldIssue } from '@/core/farmacias/domain';

/**
 * Acciones del editor: "Ver mi web" y "Publicar" (este solo si hay cambios
 * sin publicar). `compact` = barra inferior del móvil: un solo botón grande
 * (Publicar si hay cambios; si no, Ver mi web).
 *
 * Si hay traducciones pendientes, "Publicar" abre antes PublishMissingDialog
 * (confirmar, no bloquear).
 */
export function EditorActionButtons({ compact = false }: { compact?: boolean }) {
  const { farmacia, saveNow, dirty, goToSection, syncFromServer, readOnly, issues, revealErrors, pendientePublicar } = useFarmaciaEditor();
  const [blockedOpen, setBlockedOpen] = useState(false);
  const health = useI18nHealth();
  const [pending, startTx] = useTransition();
  const [warnOpen, setWarnOpen] = useState(false);

  const doPublish = () => {
    // NOTE: se captura antes del await — el contenido no cambia al guardar.
    const remaining = health.totalMissing;
    startTx(async () => {
      try {
        if (dirty) await saveNow();
        const res = await publishFarmaciaAction(farmacia.id, true);
        if (res.ok) syncFromServer(res.farmacia);
        publishToast(
          res,
          'Cambios publicados',
          remaining === 0
            ? undefined
            : `${remaining === 1 ? 'Queda 1 texto' : `Quedan ${remaining} textos`} por traducir.`,
        );
      } catch {
        toast.error('No se pudo publicar. Vuelve a intentarlo.');
        return;
      }
      setWarnOpen(false);
    });
  };

  const publish = () => {
    // 1º errores (bloquean) · 2º traducciones pendientes (solo confirman)
    if (issues.length > 0) {
      revealErrors();
      setBlockedOpen(true);
      return;
    }
    if (health.totalMissing > 0) setWarnOpen(true);
    else doPublish();
  };

  const reviewIssue = (issue: FieldIssue) => {
    setBlockedOpen(false);
    goToSection(issue.sectionKey, issue.locale);
    // Espera a que la sección se monte (transición) y lleva el foco al campo.
    window.setTimeout(() => {
      const el = issue.inputId ? document.getElementById(issue.inputId) : null;
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.focus({ preventScroll: true });
    }, 450);
  };

  const review = (sectionKey?: string) => {
    const sec =
      health.sectionsWithMissing.find((s) => s.key === sectionKey) ?? health.sectionsWithMissing[0];
    setWarnOpen(false);
    if (sec) goToSection(sec.key, localeWithMostMissing(sec));
  };

  const publishLabel = farmacia.status === 'published' ? 'Publicar cambios' : 'Publicar';
  const webUrl = landingUrl(farmacia.web);
  // "Publicar" solo cuando hay algo que llevar a la web; si no, la acción útil es verla.
  const puedePublicar = !readOnly && pendientePublicar;

  const verWeb = (
    <Button
      variant="secondary"
      size={compact ? 'lg' : 'sm'}
      disabled={!webUrl}
      title={webUrl ? undefined : 'Añade la dirección de tu web en Contacto y dirección'}
      onClick={() => webUrl && window.open(webUrl, '_blank', 'noopener,noreferrer')}
      className={cn(compact && 'flex-1 justify-center text-[15px]')}
    >
      Ver mi web
      <NavIcon name="ArrowSquareOut" size={13} />
      <span className="sr-only">(se abre en otra pestaña)</span>
    </Button>
  );

  return (
    <div className={cn('flex items-center gap-2 shrink-0', compact && 'w-full')}>
      {compact ? (
        puedePublicar ? null : verWeb
      ) : (
        verWeb
      )}

      {puedePublicar && (
        <Button
          variant="accent"
          size={compact ? 'lg' : 'sm'}
          onClick={publish}
          disabled={pending}
          className={cn(compact && 'flex-1 justify-center text-[15px]')}
        >
          <NavIcon name="Check" size={14} />
          {pending ? 'Publicando…' : publishLabel}
        </Button>
      )}

      <PublishBlockedDialog
        open={blockedOpen}
        onOpenChange={setBlockedOpen}
        issues={issues}
        onReview={reviewIssue}
      />

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
