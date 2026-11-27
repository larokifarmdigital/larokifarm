'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { enlaceVistaPreviaAction, type EnlaceVistaPrevia } from '@/features/farmacias/actions/vistaPreviaActions';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { SECTION_BY_KEY } from '@/features/farmacias/ui/lib/sectionsConfig';
import { esPaginaVistaPrevia, type MensajeSeccion, type PaginaVistaPrevia } from '@/features/farmacias/ui/lib/vistaPrevia';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';

/** Ancho con el que se dibuja la web dentro del panel (luego se escala). */
const ANCHO = { ordenador: 1280, movil: 390 } as const;
type Vista = keyof typeof ANCHO;

/** Por debajo de este ancho de panel, la vista por defecto es Móvil. */
const PANEL_ESTRECHO = 480;

/** Tras guardar, espera un poco por si llegan más guardados seguidos. */
const ESPERA_RECARGA_MS = 700;

/**
 * La web de la farmacia con lo GUARDADO (aunque no esté publicado), dentro
 * del editor. Resalta la sección que se edita y se recarga sola al guardar.
 * La página es /vista-previa de cada landing; el enlace lo firma el servidor
 * (`enlaceVistaPreviaAction`) y caduca.
 */
export function VistaPreviaPanel({ onCerrar, vistaInicial = 'ordenador' }: { onCerrar: () => void; vistaInicial?: Vista }) {
  const { farmacia, activeSectionKey, currentLocale, pendientePublicar } = useFarmaciaEditor();
  // Hasta que se elige, en un panel estrecho se ve en Móvil: en Ordenador la web
  // quedaría al ~30 % y no se leería.
  const [vistaElegida, setVista] = useState<Vista | null>(null);
  const [enlace, setEnlace] = useState<Extract<EnlaceVistaPrevia, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Pidiendo el enlace (acción del servidor) y, después, url cuya página ya ha cargado.
  const [pidiendo, startPedir] = useTransition();
  const [cargadaUrl, setCargadaUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const marcoRef = useRef<HTMLDivElement>(null);
  const [tamano, setTamano] = useState({ ancho: 0, alto: 0 });

  const etiqueta = SECTION_BY_KEY[activeSectionKey]?.label ?? '';

  // Textos legales: cada uno tiene su página. Se enseña la del texto en el que
  // se está escribiendo (el foco entra en su bloque); al empezar, el aviso legal.
  const [paginaLegal, setPaginaLegal] = useState<PaginaVistaPrevia>('aviso-legal');
  useEffect(() => {
    function onFoco(e: Event) {
      const v = (e.target as Element | null)?.closest?.('[data-pagina-vista-previa]')?.getAttribute('data-pagina-vista-previa');
      if (esPaginaVistaPrevia(v)) setPaginaLegal(v);
    }
    document.addEventListener('focusin', onFoco);
    document.addEventListener('pointerdown', onFoco);
    return () => {
      document.removeEventListener('focusin', onFoco);
      document.removeEventListener('pointerdown', onFoco);
    };
  }, []);
  const pagina = activeSectionKey === 'legal' ? paginaLegal : undefined;
  // Sección actual para el enlace y los mensajes, sin recrear las funciones al cambiarla.
  const seccionRef = useRef({ seccion: activeSectionKey, etiqueta });
  useEffect(() => {
    seccionRef.current = { seccion: activeSectionKey, etiqueta };
  }, [activeSectionKey, etiqueta]);

  const cargar = useCallback(() => {
    startPedir(async () => {
      const r = await enlaceVistaPreviaAction(farmacia.id, { lang: currentLocale, pagina, ...seccionRef.current });
      if (r.ok) {
        setError(null);
        setEnlace(r);
      } else {
        setError(r.error);
      }
    });
  }, [farmacia.id, currentLocale, pagina]);

  const cargando = !error && (pidiendo || !enlace || cargadaUrl !== enlace.url);

  // Al abrir, al cambiar de idioma (se ve la web en el idioma que se edita) y
  // al pasar a otra página (inicio ↔ textos legales).
  useEffect(() => {
    cargar();
  }, [cargar]);

  // Al guardar (cambia updatedAt), se recarga con lo nuevo.
  const guardadoRef = useRef(farmacia.updatedAt);
  useEffect(() => {
    if (farmacia.updatedAt === guardadoRef.current) return;
    guardadoRef.current = farmacia.updatedAt;
    const t = window.setTimeout(cargar, ESPERA_RECARGA_MS);
    return () => window.clearTimeout(t);
  }, [farmacia.updatedAt, cargar]);

  const enviarSeccion = useCallback(() => {
    const w = iframeRef.current?.contentWindow;
    if (!w || !enlace) return;
    const msg: MensajeSeccion = { tipo: 'larokifarm:seccion', ...seccionRef.current };
    w.postMessage(msg, enlace.origen);
  }, [enlace]);

  // Cambiar de sección no recarga: la página salta a la nueva y la resalta.
  useEffect(() => {
    enviarSeccion();
  }, [activeSectionKey, enviarSeccion]);

  // La página avisa cuando está lista (solo se escucha a su origen y a su ventana).
  useEffect(() => {
    function onMensaje(e: MessageEvent) {
      if (!enlace || e.origin !== enlace.origen || e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.tipo === 'larokifarm:lista') {
        setCargadaUrl(enlace.url);
        enviarSeccion();
      }
    }
    window.addEventListener('message', onMensaje);
    return () => window.removeEventListener('message', onMensaje);
  }, [enlace, enviarSeccion]);

  useEffect(() => {
    const el = marcoRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setTamano({ ancho: e.contentRect.width, alto: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const vista: Vista = vistaElegida ?? (tamano.ancho > 0 && tamano.ancho < PANEL_ESTRECHO ? 'movil' : vistaInicial);
  const anchoVirtual = ANCHO[vista];
  const escala = tamano.ancho ? Math.min(1, tamano.ancho / anchoVirtual) : 1;

  return (
    <section
      aria-labelledby="vista-previa-titulo"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[12px] border border-[var(--color-hairline)] bg-[var(--color-surface)]"
    >
      <header className="flex items-center gap-1 border-b border-[var(--color-hairline)] px-3 py-2">
        <div className="mr-auto min-w-0">
          <h2 id="vista-previa-titulo" className="m-0 text-[14px] font-semibold text-[var(--color-ink)]">
            Vista previa
          </h2>
          <p className="m-0 truncate text-[12.5px] text-[var(--color-muted)]">
            {etiqueta ? `${etiqueta} · ` : ''}
            {pendientePublicar ? 'lo guardado, aún sin publicar' : 'igual que tu web publicada'}
          </p>
        </div>

        <div role="group" aria-label="Tamaño de pantalla" className="flex rounded-[8px] bg-[var(--color-surface-sunken)] p-0.5">
          <BotonVista activo={vista === 'ordenador'} onClick={() => setVista('ordenador')} icono="Monitor" texto="Ordenador" />
          <BotonVista activo={vista === 'movil'} onClick={() => setVista('movil')} icono="DeviceMobile" texto="Móvil" />
        </div>
        <BotonIcono icono="ArrowsClockwise" texto="Recargar vista previa" onClick={cargar} />
        {enlace ? (
          <a
            href={enlace.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en otra pestaña"
            className={CLASE_ICONO}
          >
            <NavIcon name="ArrowSquareOut" size={16} />
            <span className="sr-only">Abrir la vista previa en otra pestaña</span>
          </a>
        ) : null}
        <BotonIcono icono="X" texto="Cerrar vista previa" onClick={onCerrar} />
      </header>

      <div ref={marcoRef} className="relative min-h-0 flex-1 overflow-hidden bg-[var(--color-surface-sunken)]">
        {error ? (
          <div role="alert" className="flex h-full items-center justify-center p-6 text-center text-[14px] text-[var(--color-ink-2)]">
            {error}
          </div>
        ) : (
          enlace &&
          tamano.ancho > 0 && (
            <div
              className="mx-auto h-full overflow-hidden bg-white shadow-sm"
              style={{ width: anchoVirtual * escala }}
            >
              <iframe
                ref={iframeRef}
                key={enlace.url}
                src={enlace.url}
                title={`Vista previa de la web de ${farmacia.nombre}`}
                onLoad={() => setCargadaUrl(enlace.url)}
                className="block origin-top-left border-0"
                style={{ width: anchoVirtual, height: tamano.alto / escala, transform: `scale(${escala})` }}
              />
            </div>
          )
        )}
        {cargando && !error && (
          <div
            role="status"
            className="absolute inset-x-0 top-3 mx-auto w-max rounded-full bg-[var(--color-ink)] px-3 py-1.5 text-[12.5px] font-medium text-white shadow"
          >
            Cargando vista previa…
          </div>
        )}
      </div>

      <p className="m-0 border-t border-[var(--color-hairline)] px-3 py-2 text-[12.5px] text-[var(--color-muted)]">
        Se actualiza sola al guardar. Para que lo vean tus clientes, pulsa Publicar.
      </p>
    </section>
  );
}

const CLASE_ICONO =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] lg:h-8 lg:w-8';

function BotonIcono({ icono, texto, onClick }: { icono: 'ArrowsClockwise' | 'X'; texto: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title={texto} aria-label={texto} className={CLASE_ICONO}>
      <NavIcon name={icono} size={16} />
    </button>
  );
}

function BotonVista({
  activo,
  onClick,
  icono,
  texto,
}: {
  activo: boolean;
  onClick: () => void;
  icono: 'Monitor' | 'DeviceMobile';
  texto: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      title={texto}
      aria-label={texto}
      className={cn(
        'flex h-11 w-11 items-center justify-center rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] lg:h-7 lg:w-8',
        activo ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]',
      )}
    >
      <NavIcon name={icono} size={16} />
    </button>
  );
}
