'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { cn } from '@/shared/lib/cn';
import { prepareImageUpload } from '@/shared/lib/prepareImageUpload';

/**
 * Capturas para los reportes (Precios y Albaranes): pegar con Ctrl/⌘+V,
 * arrastrar o elegir. Se suben a /api/incidencias/capturas (R2, solo las ve
 * la cuenta de administración) y el correo de aviso lleva sus enlaces.
 */
export type Captura = { id: string; file: File; vista: string };
export type OrigenCapturas = 'precios' | 'albaranes';

const ADMITIDOS = ['image/png', 'image/jpeg', 'image/webp'];
export const MAX_CAPTURAS = 3;

export function useCapturas() {
  const [capturas, setCapturas] = useState<Captura[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const ref = useRef(capturas);
  useEffect(() => {
    ref.current = capturas;
  }, [capturas]);
  // Libera las vistas previas al cerrar el modal.
  useEffect(() => () => ref.current.forEach((c) => URL.revokeObjectURL(c.vista)), []);

  const anadir = useCallback((files: File[]) => {
    const imagenes = files.filter((f) => ADMITIDOS.includes(f.type));
    const otras = files.length - imagenes.length;
    const entran = imagenes.slice(0, Math.max(0, MAX_CAPTURAS - ref.current.length));
    if (entran.length) {
      setCapturas((cs) => [...cs, ...entran.map((file) => ({ id: crypto.randomUUID(), file, vista: URL.createObjectURL(file) }))]);
    }
    const avisos = [
      otras > 0 ? 'Solo se admiten imágenes PNG, JPG o WebP.' : null,
      imagenes.length > entran.length ? `Como máximo ${MAX_CAPTURAS} capturas.` : null,
    ].filter(Boolean);
    setAviso(avisos.length ? avisos.join(' ') : entran.length ? `${entran.length === 1 ? 'Captura añadida' : `${entran.length} capturas añadidas`}.` : null);
  }, []);

  const quitar = useCallback((c: Captura, i: number) => {
    URL.revokeObjectURL(c.vista);
    setCapturas((cs) => cs.filter((x) => x.id !== c.id));
    setAviso(`Captura ${i + 1} quitada.`);
  }, []);

  /** Para el `onPaste` del formulario: si lo pegado son imágenes, se añaden. */
  const alPegar = useCallback(
    (e: React.ClipboardEvent) => {
      const files = [...e.clipboardData.files];
      if (files.some((f) => f.type.startsWith('image/'))) {
        e.preventDefault();
        anadir(files);
      }
    },
    [anadir],
  );

  return { capturas, aviso, anadir, quitar, alPegar };
}

/** Sube las capturas una a una. Devuelve sus enlaces absolutos o lanza con un mensaje para el usuario. */
export async function subirCapturas(capturas: Captura[], origen: OrigenCapturas, onProgreso?: (texto: string) => void): Promise<string[]> {
  const urls: string[] = [];
  for (const [i, c] of capturas.entries()) {
    onProgreso?.(`Subiendo captura ${i + 1} de ${capturas.length}…`);
    const prep = await prepareImageUpload(c.file);
    if (!prep.ok) throw new Error(`Captura ${i + 1}: ${prep.error}`);
    const form = new FormData();
    form.append('captura', prep.file);
    form.append('origen', origen);
    const res = await fetch('/api/incidencias/capturas', { method: 'POST', body: form });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !data.url) throw new Error(`Captura ${i + 1}: ${data.error ?? 'no se ha podido subir.'}`);
    urls.push(`${window.location.origin}${data.url}`);
  }
  return urls;
}

const Tecla = ({ children }: { children: string }) => (
  <kbd className="rounded border border-[var(--color-hairline)] bg-[var(--color-surface)] px-1 font-sans text-[12px]">{children}</kbd>
);

export function CapturasField({ estado, idBase, deshabilitado }: { estado: ReturnType<typeof useCapturas>; idBase: string; deshabilitado?: boolean }) {
  const { capturas, aviso, anadir, quitar } = estado;
  const [encima, setEncima] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const esError = !!aviso && /Solo se admiten|Como máximo/.test(aviso);

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" disabled={deshabilitado}>
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
        <p id={`${idBase}-capturas-ayuda`} className="m-0 text-[13.5px] leading-[1.5] text-[var(--color-ink-2)]">
          <span className="sm:hidden">Elige una captura de tu galería o de tus archivos.</span>
          <span className="hidden sm:inline">
            Pega una captura con <Tecla>Ctrl</Tecla> + <Tecla>V</Tecla> (en Mac, <Tecla>⌘</Tecla> + <Tecla>V</Tecla>), arrástrala aquí o elige un
            archivo.
          </span>
        </p>
        <Button
          type="button"
          variant="secondary"
          id={`${idBase}-elegir`}
          onClick={() => inputRef.current?.click()}
          disabled={capturas.length >= MAX_CAPTURAS}
          aria-describedby={`${idBase}-capturas-ayuda`}
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
                onClick={() => {
                  quitar(c, i);
                  requestAnimationFrame(() => document.getElementById(`${idBase}-elegir`)?.focus());
                }}
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
      {esError && <p className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">{aviso}</p>}
    </fieldset>
  );
}
