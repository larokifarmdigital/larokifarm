'use client';

import { useMemo, useState } from 'react';
import { LOCALES, LOCALE_LABELS, LOCALE_NOMBRE, nombreIdioma, type Locale } from '@/core/shared';
import { Button } from '@/shared/components/atoms/Button';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Select } from '@/shared/components/atoms/Select';
import { ConfirmDialog } from '@/shared/components/molecules/ConfirmDialog';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import {
  RowActionsItem,
  RowActionsMenu,
  RowActionsSeparator,
} from '@/shared/components/molecules/RowActionsMenu';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { resumenIdiomas, type ResumenIdioma } from '@/features/farmacias/ui/lib/i18nStatus';
import { cn } from '@/shared/lib/cn';

/**
 * Lleva el foco a la fila de un idioma (o al botón "Añadir idioma" si ya no
 * está). Con retardo: el diálogo devuelve el foco a su disparador al cerrarse.
 */
function enfocarFila(l?: Locale) {
  window.setTimeout(() => {
    // La fila está dos veces (tabla y lista móvil): solo vale la visible.
    const visible = (el: HTMLElement) => el.getClientRects().length > 0;
    const fila = l
      ? Array.from(document.querySelectorAll<HTMLElement>(`[data-idioma="${l}"]`)).find(visible)
      : null;
    (fila ?? document.querySelector<HTMLElement>('[data-anadir-idioma]'))?.focus();
  }, 120);
}

/**
 * "Idiomas de la web": qué idiomas muestra la web y cuánto falta por traducir.
 * - Castellano: principal, siempre activo (raíz de la web y texto de reserva).
 * - Desactivar no borra nada: los textos se guardan por si se vuelve a activar.
 * - Eliminar traducciones solo con el idioma desactivado (no se puede deshacer).
 * Catálogo cerrado (`LOCALES`): los textos fijos de la web ya están traducidos.
 */
export function IdiomasTab() {
  const { farmacia, readOnly, goToSection, activarIdioma, desactivarIdioma, eliminarTraducciones } =
    useFarmaciaEditor();
  const filas = useMemo(() => resumenIdiomas(farmacia), [farmacia]);
  const disponibles = LOCALES.filter((l) => !filas.some((f) => f.locale === l));

  const [anadirAbierto, setAnadirAbierto] = useState(false);
  const [nuevo, setNuevo] = useState<string>('');
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [desactivar, setDesactivar] = useState<Locale | null>(null);
  const [eliminar, setEliminar] = useState<Locale | null>(null);

  function traducir(f: ResumenIdioma) {
    goToSection(f.primeraSeccionPendiente ?? 'hero', f.locale, true);
  }

  async function confirmarAnadir() {
    if (!nuevo) {
      setErrorNuevo('Elige un idioma.');
      document.getElementById('idioma-nuevo')?.focus();
      return;
    }
    setTrabajando(true);
    const ok = await activarIdioma(nuevo as Locale);
    setTrabajando(false);
    if (ok) {
      setAnadirAbierto(false);
      enfocarFila(nuevo as Locale);
    }
  }

  async function reactivar(l: Locale) {
    if (await activarIdioma(l)) enfocarFila(l);
  }

  function accionesDe(f: ResumenIdioma) {
    if (readOnly || f.principal) return null;
    return (
      <RowActionsMenu label={`Acciones del ${LOCALE_NOMBRE[f.locale]}`}>
        {f.activo ? (
          <>
            <RowActionsItem icon="PencilSimple" onSelect={() => traducir(f)}>
              {f.porcentaje < 100 ? 'Traducir lo que falta' : 'Revisar textos'}
            </RowActionsItem>
            <RowActionsSeparator />
            <RowActionsItem icon="EyeSlash" onSelect={() => setDesactivar(f.locale)}>
              Desactivar en la web
            </RowActionsItem>
          </>
        ) : (
          <>
            <RowActionsItem icon="Eye" onSelect={() => void reactivar(f.locale)}>
              Activar en la web
            </RowActionsItem>
            <RowActionsSeparator />
            <RowActionsItem icon="Trash" peligro onSelect={() => setEliminar(f.locale)}>
              Eliminar sus textos
            </RowActionsItem>
          </>
        )}
      </RowActionsMenu>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="m-0 max-w-[60ch] text-[14px] leading-[1.55] text-[var(--color-ink-2)]">
          Lo que aún no esté traducido se verá en castellano. Los cambios de idioma salen en la web
          cuando pulsas <strong className="font-semibold">Publicar</strong>.
        </p>
        {!readOnly && disponibles.length > 0 && (
          <Button
            type="button"
            variant="accent"
            data-anadir-idioma=""
            data-foco-tras-modal=""
            onClick={() => {
              setNuevo('');
              setErrorNuevo(null);
              setAnadirAbierto(true);
            }}
            className="shrink-0"
          >
            <NavIcon name="Plus" size={16} />
            Añadir idioma
          </Button>
        )}
      </div>

      {/* Escritorio: tabla, como el resto de listas del backoffice. */}
      <div className="card hidden overflow-hidden sm:block">
        <table className="w-full text-left text-[14px]">
          <caption className="sr-only">Idiomas de la web</caption>
          <thead>
            <tr className="border-b border-[var(--color-hairline)] bg-[var(--color-surface-2)] text-[12.5px] text-[var(--color-muted)]">
              <th scope="col" className="py-2.5 pl-5 pr-3 font-semibold">
                Idioma
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Estado
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                Traducido
              </th>
              <th scope="col" className="w-14 py-2.5 pl-3 pr-5 text-right">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => (
              <tr
                key={f.locale}
                className={cn(
                  'border-b border-[var(--color-hairline)] last:border-b-0',
                  i % 2 === 1 && 'bg-[var(--color-surface-2)]',
                )}
              >
                <td className="py-3 pl-5 pr-3">
                  <NombreIdioma f={f} readOnly={readOnly} onTraducir={traducir} />
                </td>
                <td className="px-3 py-3">
                  <EstadoIdioma f={f} />
                </td>
                <td className="px-3 py-3">
                  {f.principal ? (
                    <span className="text-[13px] text-[var(--color-muted)]">Idioma original</span>
                  ) : (
                    <Progreso f={f} />
                  )}
                </td>
                <td className="py-3 pl-3 pr-4 text-right">
                  {accionesDe(f)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Móvil: la tabla no cabe; cada idioma en su fila. */}
      <ul className="card m-0 list-none divide-y divide-[var(--color-hairline)] overflow-hidden p-0 sm:hidden" aria-label="Idiomas de la web">
        {filas.map((f) => (
          <li key={f.locale} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <NombreIdioma f={f} readOnly={readOnly} onTraducir={traducir} />
                <EstadoIdioma f={f} />
              </div>
              {!f.principal && (
                <div className="mt-2">
                  <Progreso f={f} />
                </div>
              )}
            </div>
            {accionesDe(f)}
          </li>
        ))}
      </ul>

      {!readOnly && disponibles.length === 0 && (
        <p className="m-0 text-[13.5px] text-[var(--color-muted)]">
          Ya tienes todos los idiomas disponibles. Si necesitas otro, pídeselo al administrador.
        </p>
      )}

      {/* Añadir idioma */}
      <Modal
        open={anadirAbierto}
        onOpenChange={setAnadirAbierto}
        title="Añadir idioma"
        description="Tu web tendrá una versión en este idioma. Los textos fijos (menú, botones…) ya están traducidos; tú traduces tu contenido."
        footer={
          <ModalAcciones
            onCancelar={() => setAnadirAbierto(false)}
            textoPrincipal="Añadir idioma"
            textoEnviando="Añadiendo…"
            enviando={trabajando}
            onPrincipal={() => void confirmarAnadir()}
          />
        }
      >
        <div className="space-y-2">
          <label htmlFor="idioma-nuevo" className="label">
            Idioma
          </label>
          <Select
            id="idioma-nuevo"
            value={nuevo}
            onValueChange={(v) => {
              setNuevo(v);
              setErrorNuevo(null);
            }}
            placeholder="Elige un idioma"
            aria-invalid={!!errorNuevo}
            aria-describedby={errorNuevo ? 'idioma-nuevo-error' : 'idioma-nuevo-ayuda'}
            options={disponibles.map((l) => ({ value: l, label: `${nombreIdioma(l)} · ${LOCALE_LABELS[l]}` }))}
            className="w-full"
          />
          {errorNuevo ? (
            <p id="idioma-nuevo-error" role="alert" className="help help-error m-0">
              {errorNuevo}
            </p>
          ) : (
            <p id="idioma-nuevo-ayuda" className="m-0 text-[13.5px] leading-[1.5] text-[var(--color-ink-2)]">
              Mientras no lo traduzcas, esa versión mostrará tus textos en castellano. Saldrá en la web
              cuando pulses Publicar.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={desactivar !== null}
        onOpenChange={(o) => !o && setDesactivar(null)}
        title={desactivar ? `¿Desactivar el ${LOCALE_NOMBRE[desactivar]}?` : ''}
        description={
          desactivar ? (
            <>
              Cuando publiques, tu web dejará de mostrarse en {LOCALE_NOMBRE[desactivar]}. Quien entre con un enlace
              antiguo irá a la versión en castellano. Tus textos en {LOCALE_NOMBRE[desactivar]} se guardan por si
              vuelves a activarlo.
            </>
          ) : undefined
        }
        confirmLabel={desactivar ? `Desactivar ${LOCALE_NOMBRE[desactivar]}` : 'Desactivar'}
        variant="accent"
        onConfirm={() => {
          const l = desactivar;
          if (!l) return;
          void desactivarIdioma(l).then(() => enfocarFila(l));
        }}
      />

      <ConfirmDialog
        open={eliminar !== null}
        onOpenChange={(o) => !o && setEliminar(null)}
        title={eliminar ? `¿Eliminar los textos en ${LOCALE_NOMBRE[eliminar]}?` : ''}
        description={
          eliminar
            ? `Se borrarán para siempre todas las traducciones al ${LOCALE_NOMBRE[eliminar]} de tu web, también las descripciones de las fotos. No se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar textos"
        variant="danger"
        onConfirm={() => {
          const l = eliminar;
          if (!l) return;
          void eliminarTraducciones(l).then(() => enfocarFila());
        }}
      />
    </div>
  );
}

function EstadoIdioma({ f }: { f: ResumenIdioma }) {
  const [texto, clase] = f.principal
    ? ['Principal', 'bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]']
    : f.activo
      ? ['En la web', 'bg-[var(--color-green-soft)] text-[var(--color-green-ink)]']
      : ['Desactivado · textos guardados', 'bg-[var(--color-surface-sunken)] text-[var(--color-ink-2)]'];
  return <span className={cn('rounded-full px-2.5 py-0.5 text-[12.5px] font-medium', clase)}>{texto}</span>;
}

function NombreIdioma({
  f,
  readOnly,
  onTraducir,
}: {
  f: ResumenIdioma;
  readOnly: boolean;
  onTraducir: (f: ResumenIdioma) => void;
}) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      {f.activo && !f.principal && !readOnly ? (
        <button
          type="button"
          data-idioma={f.locale}
          onClick={() => onTraducir(f)}
          className="min-h-11 text-left text-[15px] font-semibold text-[var(--color-ink)] underline-offset-2 hover:text-[var(--color-accent)] hover:underline sm:min-h-8"
        >
          {nombreIdioma(f.locale)}
        </button>
      ) : (
        <span data-idioma={f.locale} tabIndex={-1} className="text-[15px] font-semibold text-[var(--color-ink)] outline-none">
          {nombreIdioma(f.locale)}
        </span>
      )}
      {f.locale !== 'es' && (
        <span className="text-[13px] text-[var(--color-muted)]" lang={f.locale}>
          {LOCALE_LABELS[f.locale]}
        </span>
      )}
    </span>
  );
}

function Progreso({ f }: { f: ResumenIdioma }) {
  return (
    <div className="flex items-center gap-3">
      <div aria-hidden className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-[var(--color-surface-sunken)]">
        <div
          className={cn(
            'h-full rounded-full',
            f.porcentaje === 100 ? 'bg-[var(--color-green-ink)]' : 'bg-[var(--color-accent)]',
          )}
          style={{ width: `${f.porcentaje}%` }}
        />
      </div>
      <span className="shrink-0 text-[13px] text-[var(--color-ink-2)]">
        {f.total === 0
          ? 'Aún no hay textos que traducir'
          : f.porcentaje === 100
            ? 'Todo traducido'
            : `${f.porcentaje} % · faltan ${f.total - f.traducidos}`}
      </span>
    </div>
  );
}
