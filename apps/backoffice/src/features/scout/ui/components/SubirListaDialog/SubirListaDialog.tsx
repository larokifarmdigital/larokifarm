'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/shared/components/atoms/Button';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { cn } from '@/shared/lib/cn';
import { textoDuracion } from '@/core/precios/domain';
import { guardarListaAction, previsualizarListaAction, type VistaPrevia } from '../../../actions/listasActions';
import { numero } from '../../lib/listas';

const ACCEPT = '.xlsx,.xls,.csv';

/** Subir lista: elegir archivo → vista previa en el mismo modal (cuántas valen y por qué se descartan) → guardar. */
export function SubirListaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const elegirRef = useRef<HTMLButtonElement>(null);
  const resumenRef = useRef<HTMLHeadingElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const [nombre, setNombre] = useState('');
  const [errorNombre, setErrorNombre] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [leyendo, startLeer] = useTransition();
  const [guardando, startGuardar] = useTransition();
  const [foco, setFoco] = useState<{ a: 'resumen' | 'elegir'; n: number } | null>(null);
  const enfocar = (a: 'resumen' | 'elegir') => setFoco((f) => ({ a, n: (f?.n ?? 0) + 1 }));
  useEffect(() => {
    if (foco) (foco.a === 'resumen' ? resumenRef : elegirRef).current?.focus();
  }, [foco]);

  function reiniciar() {
    setArchivo(null);
    setVista(null);
    setNombre('');
    setErrorNombre(null);
    setErrorGeneral(null);
  }

  function leer(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      setErrorGeneral('Sube un solo archivo.');
      enfocar('elegir');
      return;
    }
    const f = files[0];
    setErrorGeneral(null);
    startLeer(async () => {
      const fd = new FormData();
      fd.set('archivo', f);
      const v = await previsualizarListaAction(fd);
      setVista(v);
      if (v.ok) {
        setArchivo(f);
        setNombre(f.name.replace(/\.[^.]+$/, '').slice(0, 80));
        enfocar('resumen');
      } else {
        setArchivo(null);
        enfocar('elegir');
      }
    });
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo || !vista?.ok) {
      setErrorGeneral('Elige un archivo para continuar.');
      enfocar('elegir');
      return;
    }
    if (!nombre.trim()) {
      setErrorNombre('Ponle un nombre a la lista.');
      document.getElementById(`${id}-nombre`)?.focus();
      return;
    }
    startGuardar(async () => {
      const fd = new FormData();
      fd.set('archivo', archivo);
      fd.set('nombre', nombre);
      const r = await guardarListaAction(fd);
      if (!r.ok) {
        if (r.campo === 'nombre') {
          setErrorNombre(r.error);
          document.getElementById(`${id}-nombre`)?.focus();
        } else setErrorGeneral(r.error);
        return;
      }
      toast.success('Lista guardada');
      onOpenChange(false);
      reiniciar();
      try {
        sessionStorage.setItem('enfocar-titulo', '1');
      } catch {
        // sin almacenamiento: el foco se queda donde lo deje la navegación
      }
      router.push(`/scout/listas/${r.id}`);
    });
  }

  const conVista = vista?.ok ? vista : null;
  const fallo = vista && !vista.ok ? vista : null;

  return (
    <Modal
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reiniciar();
      }}
      title="Subir lista"
      description="Un Excel o CSV con los códigos nacionales de los productos que quieres comparar."
      maxWidth="lg"
      footer={<ModalAcciones onCancelar={() => onOpenChange(false)} textoPrincipal="Guardar lista" textoEnviando="Guardando…" enviando={guardando} form={`${id}-form`} />}
    >
      <form id={`${id}-form`} onSubmit={guardar} noValidate className="flex flex-col gap-4">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            leer(e.target.files);
            e.target.value = '';
          }}
        />

        {conVista && archivo ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] bg-[var(--color-surface-2)] px-3.5 py-2.5">
            <NavIcon name="FileXls" size={20} className="text-[var(--color-green-ink)]" />
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-[var(--color-ink)]">{archivo.name}</span>
            <Button type="button" variant="link" className="min-h-11 sm:min-h-0" onClick={() => inputRef.current?.click()}>
              Cambiar archivo
            </Button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!leyendo) setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              if (!leyendo) leer(e.dataTransfer.files);
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed px-5 py-8 text-center transition-colors',
              arrastrando ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]' : 'border-[var(--color-hairline-strong)] bg-[var(--color-surface)]',
            )}
          >
            <p className="hidden sm:block m-0 text-[16px] font-bold text-[var(--color-ink)]">Arrastra aquí el Excel</p>
            <button
              ref={elegirRef}
              type="button"
              aria-disabled={leyendo || undefined}
              aria-describedby={`${id}-ayuda`}
              onClick={() => !leyendo && inputRef.current?.click()}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 min-h-11 px-6 rounded-[8px] bg-[var(--color-accent)] text-white text-[15px] font-semibold hover:bg-[var(--color-accent-hover)]"
            >
              <NavIcon name="UploadSimple" size={17} />
              {fallo ? 'Elegir otro archivo' : 'Elegir archivo'}
            </button>
            <p id={`${id}-ayuda`} className="m-0 max-w-md text-[13.5px] leading-[1.5] text-[var(--color-muted)]">
              Excel o CSV con una columna de códigos nacionales (CN). Las columnas de código de barras y de nombre son opcionales. Hasta 5.000 productos.
            </p>
            {leyendo && (
              <p role="status" className="m-0 text-[14px] text-[var(--color-ink-2)]">
                Leyendo el archivo…
              </p>
            )}
          </div>
        )}

        {(errorGeneral || fallo) && (
          <p role="alert" className="m-0 rounded-[8px] bg-[var(--color-red-soft)] px-3 py-2 text-[13.5px] text-[var(--color-red-ink)]">
            {errorGeneral ?? fallo?.error}
          </p>
        )}

        {!conVista && (
          <details className="text-[13.5px] text-[var(--color-ink-2)]">
            <summary className="cursor-pointer min-h-11 sm:min-h-6 flex items-center font-medium text-[var(--color-ink)]">¿Cómo tiene que ser el archivo?</summary>
            <div className="mt-2 flex flex-col gap-2">
              <table className="text-[13px] border-collapse w-full max-w-md">
                <caption className="sr-only">Ejemplo de archivo</caption>
                <thead>
                  <tr className="bg-[var(--color-surface-2)] text-left">
                    <th scope="col" className="px-2 py-1.5 font-semibold">CN</th>
                    <th scope="col" className="px-2 py-1.5 font-semibold">Código de barras</th>
                    <th scope="col" className="px-2 py-1.5 font-semibold">Nombre</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  <tr><td className="px-2 py-1">760017</td><td className="px-2 py-1">8470007600176</td><td className="px-2 py-1">Frenadol Complex 10 sobres</td></tr>
                  <tr><td className="px-2 py-1">159188</td><td className="px-2 py-1"></td><td className="px-2 py-1">Cicaplast Baume 40 ml</td></tr>
                </tbody>
              </table>
              <p className="m-0">
                La primera fila tiene que llevar los títulos. Valen «CN», «Código nacional», «C.N.», «EAN», «Código de barras», «Nombre», «Descripción»… Si solo hay código de barras español (847000…), sacamos el código nacional de ahí.
              </p>
            </div>
          </details>
        )}

        {fallo?.descartadas && fallo.descartadas.length > 0 && <TablaDescartadas filas={fallo.descartadas} total={fallo.descartadas.length} />}

        {conVista && (
          <>
            <div>
              <Label htmlFor={`${id}-nombre`} required>
                Nombre de la lista
              </Label>
              <input
                id={`${id}-nombre`}
                className="field"
                value={nombre}
                maxLength={80}
                onChange={(e) => {
                  setNombre(e.target.value);
                  setErrorNombre(null);
                }}
                aria-invalid={!!errorNombre || undefined}
                aria-describedby={errorNombre ? `${id}-nombre-error` : undefined}
              />
              {errorNombre && (
                <p id={`${id}-nombre-error`} className="m-0 mt-1.5 text-[13px] text-[var(--color-red-ink)]">
                  {errorNombre}
                </p>
              )}
            </div>
            <div>
              <h3 ref={resumenRef} tabIndex={-1} className="m-0 text-[15px] font-normal text-[var(--color-ink)] focus:outline-none">
                <strong className="text-[var(--color-green-ink)]">{numero(conVista.validas)} productos</strong> listos para comparar
                {conVista.totalDescartadas > 0 && (
                  <>
                    {' · '}
                    <strong className="text-[var(--color-yellow-ink)]">
                      {numero(conVista.totalDescartadas)} {conVista.totalDescartadas === 1 ? 'fila' : 'filas'}
                    </strong>{' '}
                    no se van a usar
                  </>
                )}
              </h3>
              <p className="m-0 mt-1 text-[13.5px] text-[var(--color-muted)]">
                Hemos leído el código nacional de la columna «{conVista.columnas.cn}»
                {conVista.columnas.nombre ? ` y el nombre de «${conVista.columnas.nombre}»` : ''}.
              </p>
            </div>
            {conVista.totalDescartadas > 0 && (
              <details className="text-[13.5px]">
                <summary className="cursor-pointer min-h-11 sm:min-h-6 flex items-center font-medium text-[var(--color-ink)]">
                  Ver {conVista.totalDescartadas === 1 ? 'la fila que no se usa' : `las ${numero(conVista.totalDescartadas)} filas que no se usan`}
                </summary>
                <p className="m-0 mt-2 text-[var(--color-ink-2)]">{conVista.motivos.map((m) => `${m.n} · ${m.motivo.toLowerCase()}`).join(' — ')}</p>
                <TablaDescartadas filas={conVista.descartadas} total={conVista.totalDescartadas} />
              </details>
            )}
            <p className="m-0 text-[13.5px] text-[var(--color-muted)]">
              Comparar esta lista tardará {textoDuracion(conVista.segundos)}. Lo harás desde la página de la lista y no hará falta tenerla abierta.
            </p>
          </>
        )}
      </form>
    </Modal>
  );
}

function TablaDescartadas({ filas, total }: { filas: { fila: number; valor: string; motivo: string }[]; total: number }) {
  return (
    <div className="mt-2 max-h-56 overflow-auto rounded-[8px] border border-[var(--color-hairline)]" role="region" aria-label="Filas que no se usan" tabIndex={0}>
      <table className="w-full text-left text-[13px]">
        <caption className="sr-only">Filas que no se usan</caption>
        <thead className="sticky top-0 bg-[var(--color-surface-2)] text-[var(--color-muted)]">
          <tr>
            <th scope="col" className="px-2.5 py-1.5 font-semibold">Fila</th>
            <th scope="col" className="px-2.5 py-1.5 font-semibold">Lo que pone</th>
            <th scope="col" className="px-2.5 py-1.5 font-semibold">Motivo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-hairline)]">
          {filas.map((f) => (
            <tr key={f.fila}>
              <td className="px-2.5 py-1.5 tabular-nums">{f.fila}</td>
              <td className="px-2.5 py-1.5 break-all">{f.valor}</td>
              <td className="px-2.5 py-1.5">{f.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total > filas.length && <p className="m-0 px-2.5 py-1.5 text-[var(--color-muted)]">y {numero(total - filas.length)} más</p>}
    </div>
  );
}
