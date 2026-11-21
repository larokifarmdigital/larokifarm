'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { LOCALE_NOMBRE, LOCALE_PRINCIPAL, type Locale } from '@/core/shared';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { sugerirTraduccionAction } from '@/features/farmacias/actions/traduccionActions';

const sinEtiquetas = (html: string) =>
  html
    .replace(/<\/(p|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * "Sugerir traducción" (IA) bajo un campo multilang. Nunca guarda sola: la
 * sugerencia sale como borrador con "Usar esta traducción" / "Descartar".
 * Solo aparece si se edita un idioma que no es el castellano y hay texto en
 * castellano. Gasta crédito de IA del negocio (con presupuesto mensual).
 */
export function SugerirTraduccion({
  origen,
  destino,
  actual,
  html = false,
  campoId,
  etiqueta,
  onUsar,
}: {
  /** Texto en castellano del campo. */
  origen: string | undefined;
  destino: Locale;
  /** Texto que ya hay en el idioma de destino (para avisar de que se sustituye). */
  actual: string | undefined;
  html?: boolean;
  /** id del campo, para devolverle el foco al usar la traducción. */
  campoId?: string;
  /** Etiqueta del campo: distingue los botones cuando hay varios en la sección. */
  etiqueta?: string;
  /** Si el campo gestiona su propio foco al usar (Tiptap), aquí no se toca. */
  onUsar: (texto: string) => void;
}) {
  const { farmacia, readOnly } = useFarmaciaEditor();
  const [estado, setEstado] = useState<'inactivo' | 'pidiendo' | 'listo'>('inactivo');
  const [sugerencia, setSugerencia] = useState('');
  const [error, setError] = useState<string | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  // Al llegar la sugerencia, el foco va al panel para revisarla
  useEffect(() => {
    if (estado === 'listo') panelRef.current?.focus();
  }, [estado]);

  const textoOrigen = html ? sinEtiquetas(origen ?? '') : (origen ?? '').trim();
  if (readOnly || destino === LOCALE_PRINCIPAL || !textoOrigen) return null;
  const yaTiene = html ? !!sinEtiquetas(actual ?? '') : !!actual?.trim();

  async function pedir() {
    // aria-disabled (no disabled): el botón conserva el foco mientras traduce
    if (estado === 'pidiendo') return;
    setEstado('pidiendo');
    setError(null);
    try {
      const r = await sugerirTraduccionAction(farmacia.id, origen ?? '', destino, html);
      if (!r.ok) {
        setError(r.error);
        setEstado('inactivo');
        requestAnimationFrame(() => botonRef.current?.focus());
        return;
      }
      setSugerencia(r.texto);
      setEstado('listo');
    } catch {
      setError('No se pudo pedir la traducción. Revisa la conexión.');
      setEstado('inactivo');
      requestAnimationFrame(() => botonRef.current?.focus());
    }
  }

  function cerrar(usar: boolean) {
    if (usar) onUsar(sugerencia);
    setEstado('inactivo');
    setSugerencia('');
    // Al usar sin campoId (Tiptap), el propio editor ya se enfocó: no robarle el foco.
    if (usar && !campoId) return;
    requestAnimationFrame(() => {
      const campo = campoId ? document.getElementById(campoId) : null;
      (usar && campo ? campo : botonRef.current)?.focus();
    });
  }

  return (
    <div className="mt-1.5">
      {estado !== 'listo' && (
        <Button
          ref={botonRef}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void pedir()}
          aria-disabled={estado === 'pidiendo' || undefined}
          aria-label={
            etiqueta
              ? `${estado === 'pidiendo' ? 'Traduciendo…' : `Sugerir traducción al ${LOCALE_NOMBRE[destino]}`}: ${etiqueta}`
              : undefined
          }
          className="-ml-2 text-[var(--color-accent)] aria-disabled:opacity-60 aria-disabled:cursor-wait"
        >
          <NavIcon name="Sparkle" size={15} />
          {estado === 'pidiendo' ? 'Traduciendo…' : `Sugerir traducción al ${LOCALE_NOMBRE[destino]}`}
        </Button>
      )}
      <p role="status" className="sr-only">
        {estado === 'pidiendo' ? 'Traduciendo…' : estado === 'listo' ? 'Traducción sugerida lista para revisar.' : ''}
      </p>
      {error && (
        <p role="alert" className="help help-error m-0 mt-1">
          {error}
        </p>
      )}

      {estado === 'listo' && (
        <div
          ref={panelRef}
          tabIndex={-1}
          role="region"
          aria-labelledby={tituloId}
          className="mt-2 rounded-[10px] border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)] p-3 outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
        >
          <p id={tituloId} className="m-0 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-accent-ink)]">
            <NavIcon name="Sparkle" size={14} />
            Traducción sugerida · revísala antes de usarla
          </p>
          <p lang={destino} className="m-0 mt-2 whitespace-pre-line text-[14px] leading-[1.55] text-[var(--color-ink)]">
            {html ? sinEtiquetas(sugerencia) : sugerencia}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="accent" size="sm" onClick={() => cerrar(true)}>
              {yaTiene ? 'Usar y sustituir lo escrito' : 'Usar esta traducción'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => cerrar(false)}>
              Descartar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
