'use client';

import { useEffect, useRef } from 'react';
import { useFarmaciaEditor } from '../EditorContext';
import type { Farmacia, Locale } from '@/types/content';

/**
 * Contrato de mensajes entre backoffice ↔ landing (Fase 5 del plan).
 * La landing Astro montará una ruta /preview/[slug] que escucha estos
 * mensajes y renderiza en modo borrador.
 */
type PreviewOutgoing =
  | { type: 'PREVIEW_INIT'; payload: { farmacia: Farmacia; locale: Locale } }
  | { type: 'PREVIEW_UPDATE'; payload: { farmacia: Farmacia; locale: Locale } };

type PreviewIncoming =
  | { type: 'PREVIEW_READY' }
  | { type: 'PREVIEW_NAVIGATED'; payload: { section: string } };

// TODO(fase-5): cambiar por el dominio real de la landing en producción
// y por http://localhost:4321 en desarrollo. Nunca usar '*' en producción.
const PREVIEW_ORIGIN = '*';
const PREVIEW_URL: string | null = null;

export function PreviewPanel() {
  const { farmacia, currentLocale } = useFarmaciaEditor();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);

  const enabled = PREVIEW_URL !== null;

  useEffect(() => {
    if (!enabled) return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const send = (msg: PreviewOutgoing) => {
      iframe.contentWindow?.postMessage(msg, PREVIEW_ORIGIN);
    };

    const onLoad = () => {
      send({ type: 'PREVIEW_INIT', payload: { farmacia, locale: currentLocale } });
    };

    const onMessage = (e: MessageEvent<PreviewIncoming>) => {
      // TODO(fase-5): validar e.origin === PREVIEW_ORIGIN
      if (e.data?.type === 'PREVIEW_READY') {
        readyRef.current = true;
      }
    };

    iframe.addEventListener('load', onLoad);
    window.addEventListener('message', onMessage);
    return () => {
      iframe.removeEventListener('load', onLoad);
      window.removeEventListener('message', onMessage);
    };
  }, [enabled, farmacia, currentLocale]);

  useEffect(() => {
    if (!enabled || !readyRef.current) return;
    const iframe = iframeRef.current;
    iframe?.contentWindow?.postMessage(
      { type: 'PREVIEW_UPDATE', payload: { farmacia, locale: currentLocale } } satisfies PreviewOutgoing,
      PREVIEW_ORIGIN,
    );
  }, [enabled, farmacia, currentLocale]);

  if (!enabled) {
    return (
      <div className="h-full w-full grid place-items-center bg-[var(--color-surface-sunken)] p-8">
        <div className="max-w-sm text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-[var(--color-surface)] border border-[var(--color-hairline)] grid place-items-center mb-5">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-[var(--color-muted)]"
              aria-hidden
            >
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M8 21h8M12 18v3" />
            </svg>
          </div>
          <h3 className="text-[19px] tracking-[-0.025em] font-medium text-[var(--color-ink)] m-0">
            Vista previa en vivo
          </h3>
          <p className="mt-2 text-[13px] text-[var(--color-muted)] leading-[1.6]">
            Cuando la landing esté conectada al backoffice, aquí verás la web
            real actualizándose mientras editas.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 chip chip-neutral">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-muted-2)]"
            />
            Pendiente Fase 5
          </div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={PREVIEW_URL!}
      title="Vista previa de la landing"
      className="h-full w-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}
