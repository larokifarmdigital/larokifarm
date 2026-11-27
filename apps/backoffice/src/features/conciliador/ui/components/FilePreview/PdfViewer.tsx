'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { BuscadorVisor, buscarEn, normalizarBusqueda } from './BuscadorVisor';

// NOTE: worker de PDF.js desde unpkg — evita configurar Webpack en Next.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  /** Blob local (subida) o URL remota (historial en R2). */
  file: File | string;
}

interface Coincidencia {
  pagina: number;
  item: number;
  inicio: number;
}

const MARCA = 'rounded-[2px] bg-yellow-300/70 text-transparent';
const MARCA_ACTUAL = 'rounded-[2px] bg-orange-500/70 text-transparent outline outline-2 outline-orange-600';

function escaparHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/**
 * Todas las páginas seguidas con scroll vertical y buscador sobre el texto del PDF. Una coincidencia
 * partida entre dos trozos de texto no se encuentra (pasa poco: PDF.js suele dar cada celda entera).
 */
export default function PdfViewer({ file }: PdfViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [paginaVisible, setPaginaVisible] = useState(1);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textos, setTextos] = useState<string[][]>([]);
  const [busqueda, setBusqueda] = useState('');
  // Lo que se busca de verdad: espera a que se deje de escribir, porque cada
  // cambio vuelve a pintar la capa de texto de todas las páginas.
  const [consulta, setConsulta] = useState('');
  const esperaRef = useRef<number | undefined>(undefined);
  const [actual, setActual] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const paginasRef = useRef(new Map<number, HTMLDivElement>());
  const pendienteRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const q = normalizarBusqueda(consulta.trim());

  const { coincidencias, porItem } = useMemo(() => {
    const lista: Coincidencia[] = [];
    const mapa = new Map<string, { inicio: number; indice: number }[]>();
    if (!q) return { coincidencias: lista, porItem: mapa };
    textos.forEach((items, p) => {
      items.forEach((str, k) => {
        for (const inicio of buscarEn(str, q)) {
          const clave = `${p + 1}-${k}`;
          const arr = mapa.get(clave) ?? [];
          arr.push({ inicio, indice: lista.length });
          mapa.set(clave, arr);
          lista.push({ pagina: p + 1, item: k, inicio });
        }
      });
    });
    return { coincidencias: lista, porItem: mapa };
  }, [textos, q]);

  const marcaQ = encodeURIComponent(q);

  const renderTexto = useCallback(
    ({ pageNumber, itemIndex, str }: { pageNumber: number; itemIndex: number; str: string }) => {
      const marcas = porItem.get(`${pageNumber}-${itemIndex}`);
      if (!marcas) return escaparHtml(str);
      let html = '';
      let desde = 0;
      for (const m of marcas) {
        html += escaparHtml(str.slice(desde, m.inicio));
        const clase = m.indice === actual ? MARCA_ACTUAL : MARCA;
        html += `<mark class="${clase}" data-c="${m.indice}" data-q="${marcaQ}">${escaparHtml(str.slice(m.inicio, m.inicio + q.length))}</mark>`;
        desde = m.inicio + q.length;
      }
      return html + escaparHtml(str.slice(desde));
    },
    [porItem, actual, marcaQ, q.length],
  );

  const irAMarcaActual = useCallback((): boolean => {
    const marca = containerRef.current?.querySelector<HTMLElement>(`mark[data-c="${actual}"][data-q="${marcaQ}"]`);
    if (!marca) return false;
    marca.scrollIntoView({ block: 'center', inline: 'nearest' });
    return true;
  }, [actual, marcaQ]);

  // Al cambiar de coincidencia: si su página ya pintó la marca, se centra; si
  // no, se baja a la página y se reintenta cuando su capa de texto termine.
  useEffect(() => {
    const m = coincidencias[actual];
    if (!m) return;
    if (irAMarcaActual()) {
      pendienteRef.current = false;
      return;
    }
    pendienteRef.current = true;
    paginasRef.current.get(m.pagina)?.scrollIntoView({ block: 'start' });
  }, [coincidencias, actual, irAMarcaActual]);

  async function onLoadSuccess(pdf: PDFDocumentProxy) {
    setNumPages(pdf.numPages);
    setPaginaVisible(1);
    setError(null);
    const paginas = await Promise.all(
      Array.from({ length: pdf.numPages }, async (_, i) => {
        const page = await pdf.getPage(i + 1);
        const contenido = await page.getTextContent();
        return contenido.items.map((it) => ('str' in it ? it.str : ''));
      }),
    );
    setTextos(paginas);
  }

  function onLoadError(e: Error) {
    setError(e.message || 'No se pudo cargar el PDF.');
  }

  function irAPagina(n: number) {
    if (Number.isNaN(n) || numPages === 0) return;
    const p = clamp(Math.round(n), 1, numPages);
    paginasRef.current.get(p)?.scrollIntoView({ block: 'start' });
  }

  // Página visible = la última cuya parte de arriba ya pasó el primer tercio del visor.
  function alHacerScroll() {
    const cont = containerRef.current;
    if (!cont) return;
    const limite = cont.getBoundingClientRect().top + cont.clientHeight / 3;
    let visible = 1;
    for (const [n, el] of paginasRef.current) {
      if (el.getBoundingClientRect().top <= limite && n > visible) visible = n;
    }
    setPaginaVisible(visible);
  }

  function cambiarBusqueda(v: string) {
    setBusqueda(v);
    window.clearTimeout(esperaRef.current);
    esperaRef.current = window.setTimeout(() => {
      setConsulta(v);
      setActual(0);
    }, 250);
  }

  useEffect(() => () => window.clearTimeout(esperaRef.current), []);

  function irCoincidencia(delta: 1 | -1) {
    const total = coincidencias.length;
    if (total === 0) return;
    setActual((a) => (a + delta + total) % total);
  }

  function zoom(delta: number) {
    setScale((s) => clamp(s + delta, 0.5, 3));
  }

  const anchoPagina = containerWidth ? Math.min(containerWidth - 40, 1200) * scale : undefined;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-100">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex items-center gap-1">
          <ToolbarButton onClick={() => irAPagina(paginaVisible - 1)} disabled={paginaVisible <= 1} title="Página anterior">
            <ChevronLeftIcon />
          </ToolbarButton>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <input
              key={paginaVisible}
              type="number"
              min={1}
              max={numPages || 1}
              defaultValue={paginaVisible}
              aria-label="Ir a la página"
              onKeyDown={(e) => {
                if (e.key === 'Enter') irAPagina(Number(e.currentTarget.value));
              }}
              onBlur={(e) => {
                if (Number(e.currentTarget.value) !== paginaVisible) irAPagina(Number(e.currentTarget.value));
              }}
              className="h-11 w-14 rounded-md border border-slate-300 px-2 text-center text-xs sm:h-8"
            />
            <span>de {numPages || '—'}</span>
          </div>
          <ToolbarButton onClick={() => irAPagina(paginaVisible + 1)} disabled={paginaVisible >= numPages} title="Página siguiente">
            <ChevronRightIcon />
          </ToolbarButton>
        </div>

        <BuscadorVisor
          valor={busqueda}
          onCambio={cambiarBusqueda}
          total={coincidencias.length}
          actual={actual}
          onIr={irCoincidencia}
          etiqueta="Buscar en el PDF"
          className="order-last w-full sm:order-none sm:w-auto"
        />

        <div className="flex items-center gap-1">
          <ToolbarButton onClick={() => zoom(-0.2)} disabled={scale <= 0.5} title="Reducir zoom">
            <MinusIcon />
          </ToolbarButton>
          <span className="hidden w-12 text-center text-xs tabular-nums text-slate-600 sm:inline">{Math.round(scale * 100)}%</span>
          <ToolbarButton onClick={() => zoom(+0.2)} disabled={scale >= 3} title="Aumentar zoom">
            <PlusIcon />
          </ToolbarButton>
          <ToolbarButton onClick={() => setScale(1)} disabled={scale === 1} title="Ajustar al ancho">
            <FitIcon />
          </ToolbarButton>
        </div>
      </div>

      <div
        ref={containerRef}
        tabIndex={0}
        role="region"
        aria-label="Vista del PDF"
        onScroll={alHacerScroll}
        className="flex-1 overflow-auto"
      >
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-700">{error}</div>
        ) : (
          <Document
            file={file}
            onLoadSuccess={onLoadSuccess}
            onLoadError={onLoadError}
            loading={
              <div className="flex justify-center p-6">
                <Loader label="Cargando PDF…" />
              </div>
            }
            error={<div className="p-6 text-center text-sm text-red-700">No se pudo cargar el PDF.</div>}
            className="flex flex-col items-center gap-4 p-4"
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                ref={(el) => {
                  if (el) paginasRef.current.set(n, el);
                  else paginasRef.current.delete(n);
                }}
                className="scroll-mt-4"
              >
                <Page
                  pageNumber={n}
                  width={anchoPagina}
                  renderTextLayer
                  renderAnnotationLayer
                  customTextRenderer={renderTexto}
                  onRenderTextLayerSuccess={() => {
                    if (pendienteRef.current && coincidencias[actual]?.pagina === n && irAMarcaActual()) {
                      pendienteRef.current = false;
                    }
                  }}
                  className="shadow-lg"
                  loading={
                    <div className="flex min-h-40 items-center justify-center bg-white" style={{ width: anchoPagina }}>
                      <Loader label={`Cargando página ${n}…`} />
                    </div>
                  }
                />
              </div>
            ))}
          </Document>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Loader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
        aria-hidden
      />
      {label}
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}
