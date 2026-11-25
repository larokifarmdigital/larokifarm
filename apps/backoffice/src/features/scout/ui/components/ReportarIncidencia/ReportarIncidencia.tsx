'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/atoms/Button';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { cn } from '@/shared/lib/cn';
import { prepareImageUpload } from '@/shared/lib/prepareImageUpload';
import { SUPPORT_EMAIL } from '@/shared/lib/support';
import { WEB3FORMS_KEY, enviarCorreo } from '@/shared/lib/web3forms';
import { useAyuda } from '@/features/shell';

/** De qué es la incidencia: sale en el correo con su enlace. */
export type ContextoIncidencia = {
  /** "Consulta de precio" | "Lista de precios" */
  que: string;
  /** Producto con su CN, o nombre de la lista. */
  titulo: string;
  /** Ruta interna (p. ej. /scout/historial/<id>). */
  enlace: string;
};

const MAX_CAPTURAS = 3;
const MAX_TEXTO = 2000;
const ADMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];

type Captura = { id: string; file: File; vista: string };

/** Botón "Reportar un problema" + su modal (búsqueda y detalle del historial). */
export function ReportarIncidenciaBoton({ contexto, className }: { contexto: ContextoIncidencia; className?: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" className={className} onClick={() => setAbierto(true)} aria-haspopup="dialog">
        <NavIcon name="Flag" size={16} />
        Reportar un problema
      </Button>
      {abierto && <ReportarIncidenciaDialog contexto={contexto} onClose={() => setAbierto(false)} />}
    </>
  );
}

async function subirCaptura(file: File): Promise<string> {
  const prep = await prepareImageUpload(file);
  if (!prep.ok) throw new Error(prep.error);
  const form = new FormData();
  form.append('captura', prep.file);
  const res = await fetch('/api/incidencias/capturas', { method: 'POST', body: form });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'No se ha podido subir la captura.');
  return data.url;
}

export function ReportarIncidenciaDialog({ contexto, onClose }: { contexto: ContextoIncidencia; onClose: () => void }) {
  const id = useId();
  const { usuario } = useAyuda();
  const [texto, setTexto] = useState('');
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [encima, setEncima] = useState(false);
  const [progreso, setProgreso] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const capturasRef = useRef(capturas);
  useEffect(() => {
    capturasRef.current = capturas;
  }, [capturas]);

  // Libera las vistas previas al cerrar.
  useEffect(() => () => capturasRef.current.forEach((c) => URL.revokeObjectURL(c.vista)), []);

  function anadir(files: File[]) {
    const imagenes = files.filter((f) => ADMITIDOS.includes(f.type));
    const otras = files.length - imagenes.length;
    const hueco = MAX_CAPTURAS - capturas.length;
    const entran = imagenes.slice(0, Math.max(0, hueco));
    if (entran.length) {
      setCapturas((cs) => [...cs, ...entran.map((file) => ({ id: crypto.randomUUID(), file, vista: URL.createObjectURL(file) }))]);
    }
    const avisos = [
      otras > 0 ? 'Solo se admiten imágenes PNG, JPG o WebP.' : null,
      imagenes.length > entran.length ? `Como máximo ${MAX_CAPTURAS} capturas.` : null,
    ].filter(Boolean);
    setAviso(avisos.length ? avisos.join(' ') : entran.length ? `${entran.length === 1 ? 'Captura añadida' : `${entran.length} capturas añadidas`}.` : null);
  }

  function quitar(c: Captura, i: number) {
    URL.revokeObjectURL(c.vista);
    setCapturas((cs) => cs.filter((x) => x.id !== c.id));
    setAviso(`Captura ${i + 1} quitada.`);
    requestAnimationFrame(() => document.getElementById(`${id}-elegir`)?.focus());
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorGeneral(null);
    const limpio = texto.trim();
    if (limpio.length < 5) {
      setError('Cuéntanos qué pasa (al menos unas palabras).');
      document.getElementById(`${id}-texto`)?.focus();
      return;
    }
    if (!WEB3FORMS_KEY) {
      setErrorGeneral(
        process.env.NODE_ENV !== 'production'
          ? 'Solo en local: falta NEXT_PUBLIC_WEB3FORMS_KEY en apps/backoffice/.env.local (y reiniciar pnpm dev).'
          : SUPPORT_EMAIL
            ? `No se puede enviar ahora. Escríbenos a ${SUPPORT_EMAIL}.`
            : 'No se puede enviar ahora. Inténtalo más tarde.',
      );
      return;
    }
    startTransition(async () => {
      const urls: string[] = [];
      try {
        for (const [i, c] of capturas.entries()) {
          setProgreso(`Subiendo captura ${i + 1} de ${capturas.length}…`);
          urls.push(`${window.location.origin}${await subirCaptura(c.file)}`);
        }
      } catch (err) {
        setProgreso(null);
        setErrorGeneral(`${(err as Error).message} Quita esa captura o inténtalo de nuevo.`);
        return;
      }
      setProgreso('Enviando…');
      const ok = await enviarCorreo({
        asunto: `[Backoffice] Incidencia en precios — ${contexto.titulo}`,
        deParte: 'Backoffice Larokifarm',
        responderA: usuario?.email,
        campos: {
          'Qué pasa': limpio,
          Dónde: `${contexto.que}: ${contexto.titulo}`,
          Enlace: `${window.location.origin}${contexto.enlace}`,
          Capturas: urls.length ? urls.join('\n') : 'Ninguna',
          'Lo reporta': usuario ? `${usuario.nombre} <${usuario.email}>` : '—',
          Farmacia: usuario?.farmacias ?? '—',
        },
      });
      setProgreso(null);
      if (!ok) {
        setErrorGeneral(
          SUPPORT_EMAIL ? `No se ha podido enviar. Inténtalo de nuevo o escribe a ${SUPPORT_EMAIL}.` : 'No se ha podido enviar. Inténtalo de nuevo.',
        );
        return;
      }
      onClose();
      toast.success('Incidencia enviada', { description: 'La revisaremos y te responderemos por correo.' });
    });
  }

  return (
    <Modal
      open
      onOpenChange={(o) => !o && !pendiente && onClose()}
      title="Reportar un problema"
      description={`${contexto.que}: ${contexto.titulo}`}
      footer={
        <ModalAcciones
          onCancelar={onClose}
          textoPrincipal="Enviar"
          textoEnviando={progreso ?? 'Enviando…'}
          enviando={pendiente}
          form={`${id}-form`}
        />
      }
    >
      <form
        id={`${id}-form`}
        onSubmit={enviar}
        noValidate
        className="flex flex-col gap-4"
        onPaste={(e) => {
          const files = [...e.clipboardData.files];
          if (files.some((f) => f.type.startsWith('image/'))) {
            e.preventDefault();
            anadir(files);
          }
        }}
      >
        {errorGeneral && (
          <p role="alert" className="m-0 rounded-[8px] bg-[var(--color-red-soft)] px-3 py-2 text-[13.5px] text-[var(--color-red-ink)]">
            {errorGeneral}
          </p>
        )}
        <div>
          <Label htmlFor={`${id}-texto`} required>
            ¿Qué pasa?
          </Label>
          <textarea
            id={`${id}-texto`}
            className="field min-h-[120px] resize-y py-2.5"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            maxLength={MAX_TEXTO}
            required
            placeholder="Por ejemplo: el precio de Farmacia Barata es de otro tamaño (500 ml en vez de 75 ml)."
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && (
            <p id={`${id}-error`} className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">
              {error}
            </p>
          )}
        </div>

        <fieldset className="m-0 min-w-0 border-0 p-0">
          <legend className="label mb-1">
            Capturas <span className="font-normal text-[var(--color-muted)]">(opcional, hasta {MAX_CAPTURAS})</span>
          </legend>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setEncima(true);
            }}
            onDragLeave={() => setEncima(false)}
            onDrop={(e) => {
              e.preventDefault();
              setEncima(false);
              anadir([...e.dataTransfer.files]);
            }}
            className={cn(
              'flex flex-col items-center gap-2 rounded-[10px] border-2 border-dashed px-4 py-4 text-center',
              encima ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[var(--color-control-border)] bg-[var(--color-surface-2)]',
            )}
          >
            <p id={`${id}-capturas-ayuda`} className="m-0 text-[13.5px] leading-[1.5] text-[var(--color-ink-2)]">
              <span className="sm:hidden">Elige una captura de tu galería o de tus archivos.</span>
              <span className="hidden sm:inline">
              Pega una captura con <kbd className="rounded border border-[var(--color-hairline)] bg-[var(--color-surface)] px-1 font-sans text-[12px]">Ctrl</kbd>
              {' + '}
              <kbd className="rounded border border-[var(--color-hairline)] bg-[var(--color-surface)] px-1 font-sans text-[12px]">V</kbd>
              {' '}(en Mac, <kbd className="rounded border border-[var(--color-hairline)] bg-[var(--color-surface)] px-1 font-sans text-[12px]">⌘</kbd>
              {' + '}
              <kbd className="rounded border border-[var(--color-hairline)] bg-[var(--color-surface)] px-1 font-sans text-[12px]">V</kbd>
              ), arrástrala aquí o elige un archivo.
              </span>
            </p>
            <Button
              type="button"
              variant="secondary"
              id={`${id}-elegir`}
              onClick={() => inputRef.current?.click()}
              disabled={capturas.length >= MAX_CAPTURAS}
              aria-describedby={`${id}-capturas-ayuda`}
            >
              <NavIcon name="UploadSimple" size={16} />
              Elegir captura
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept={ADMITIDOS.join(',')}
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                anadir([...(e.target.files ?? [])]);
                e.target.value = '';
              }}
            />
          </div>
          {capturas.length > 0 && (
            <ul className="m-0 mt-3 grid list-none grid-cols-3 gap-2 p-0">
              {capturas.map((c, i) => (
                <li key={c.id} className="relative overflow-hidden rounded-[8px] border border-[var(--color-hairline)] bg-[var(--color-surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                  <img src={c.vista} alt={`Captura ${i + 1}`} className="block aspect-[4/3] w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => quitar(c, i)}
                    aria-label={`Quitar la captura ${i + 1}`}
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-ink)]/80 text-white hover:bg-[var(--color-ink)]"
                  >
                    <NavIcon name="X" size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p role="status" aria-live="polite" className="sr-only">
            {aviso}
          </p>
          {aviso && /Solo se admiten|Como máximo/.test(aviso) && (
            <p className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">{aviso}</p>
          )}
        </fieldset>
      </form>
    </Modal>
  );
}
