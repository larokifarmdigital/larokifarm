'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { LOCALES, type Locale } from '@/core/shared';
import type { ResponsableDisponible } from '@/core/farmacias/domain';
import { Button } from '@/shared/components/atoms/Button';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { Select } from '@/shared/components/atoms/Select';
import { Modal, ModalAcciones } from '@/shared/components/molecules/Modal';
import { slugify } from '@/shared/lib/slugify';
import {
  createFarmaciaAction,
  type CreateFarmaciaState,
} from '@/features/farmacias/actions/farmaciaActions';
import { LanguagePicker } from './LanguagePicker';

/** Orden en que se enfoca el primer campo con error devuelto por el servidor. */
const CAMPOS = ['nombre', 'slug', 'idiomas', 'responsable'] as const;

/**
 * "Nueva farmacia": botón accent de la cabecera de /farmacias que abre un
 * MODAL (son 5 campos: una página propia o un wizard era ceremonia).
 * - `?nueva=1` en la URL también lo abre (enlaces antiguos a /farmacias/nueva).
 * - Al crear: se cierra, la fila nueva queda resaltada (`?creada=<id>`) y un
 *   toast ofrece "Abrir editor". Nos quedamos en la lista: el admin a menudo
 *   crea la farmacia y asigna/rellena después.
 */
export function NuevaFarmaciaBoton({ responsables }: { responsables: ResponsableDisponible[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const abiertoPorUrl = sp.get('nueva') === '1';
  const [abierto, setAbierto] = useState(false);
  // Al cerrar se monta de nuevo (key): el formulario empieza limpio cada vez.
  const [vez, setVez] = useState(0);
  const open = abierto || abiertoPorUrl;

  function cambiar(o: boolean) {
    setAbierto(o);
    if (!o) {
      setVez((v) => v + 1);
      if (abiertoPorUrl) router.replace(pathname, { scroll: false });
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="accent"
        size="md"
        aria-haspopup="dialog"
        data-nueva-farmacia
        // Si el modal se abrió desde la URL (?nueva=1), al cerrar el foco vuelve aquí
        data-foco-tras-modal
        className="flex-1 sm:flex-none"
        onClick={() => setAbierto(true)}
      >
        <NavIcon name="Plus" size={14} />
        Nueva farmacia
      </Button>
      {open && (
        <FormularioNuevaFarmacia
          key={vez}
          responsables={responsables}
          onCerrar={() => cambiar(false)}
          onCreada={(id, nombre) => {
            setAbierto(false);
            setVez((v) => v + 1);
            router.replace(`${pathname}?creada=${encodeURIComponent(id)}`, { scroll: false });
            toast.success(`«${nombre}» creada como borrador`, {
              description: 'Complétala y publícala cuando esté lista.',
              duration: 10_000,
              action: { label: 'Abrir editor', onClick: () => router.push(`/farmacias/${id}`) },
            });
          }}
        />
      )}
    </>
  );
}

function FormularioNuevaFarmacia({
  responsables,
  onCerrar,
  onCreada,
}: {
  responsables: ResponsableDisponible[];
  onCerrar: () => void;
  onCreada: (id: string, nombre: string) => void;
}) {
  const formId = useId();
  const [nombre, setNombre] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [slug, setSlug] = useState('');
  const [editandoSlug, setEditandoSlug] = useState(false);
  const [idiomas, setIdiomas] = useState<Locale[]>(['es']);
  const [state, formAction, pending] = useActionState<CreateFarmaciaState, FormData>(createFarmaciaAction, {
    status: 'idle',
  });

  const slugFinal = (editandoSlug ? slug : slugify(nombre)).slice(0, 60).replace(/^-+|-+$/g, '');
  const fieldError = (k: string) => (state.status === 'error' ? state.fieldErrors?.[k] : undefined);
  const nombreOk = nombre.trim().length >= 2;
  // Validación al enviar: el botón siempre está activo; tras un intento, el
  // nombre vacío se marca en el campo.
  const [intento, setIntento] = useState(false);
  const errorNombre = fieldError('nombre') ?? (intento && !nombreOk ? 'Escribe el nombre (mínimo 2 caracteres).' : undefined);
  const [avanzadas, setAvanzadas] = useState(false);

  // Si el servidor rechaza el identificador, se abre su campo (ajuste en render, no en effect).
  const [estadoVisto, setEstadoVisto] = useState(state);
  if (state !== estadoVisto) {
    setEstadoVisto(state);
    if (state.status === 'error' && state.fieldErrors?.slug) {
      setEditandoSlug(true);
      setAvanzadas(true);
    }
  }

  useEffect(() => {
    if (state.status === 'ok') {
      onCreada(state.id, state.nombre);
      return;
    }
    if (state.status !== 'error') return;
    // Error del servidor: aviso + foco en el primer campo que falla.
    const campo = CAMPOS.find((k) => state.fieldErrors?.[k]);
    toast.error(campo ? state.fieldErrors?.[campo] ?? state.message : state.message);
    if (campo) window.setTimeout(() => document.getElementById(campo === 'idiomas' ? 'idiomas-ca' : campo)?.focus(), 0);
    // onCreada cambia en cada render del padre; solo importa el estado nuevo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const toggleIdioma = (l: Locale) =>
    setIdiomas((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : LOCALES.filter((x) => x === l || prev.includes(x)),
    );

  return (
    <Modal
      open
      onOpenChange={(o) => !o && !pending && onCerrar()}
      title="Nueva farmacia"
      maxWidth="md"
      description="Se crea como borrador. Horario, servicios y fotos los completas después."
      footer={
        <ModalAcciones
          onCancelar={onCerrar}
          textoPrincipal="Crear borrador"
          textoEnviando="Creando…"
          enviando={pending}
          form={formId}
        />
      }
    >
      <form
        id={formId}
        action={formAction}
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          if (!nombreOk) {
            e.preventDefault();
            setIntento(true);
            document.getElementById('nombre')?.focus();
          }
        }}
      >
        {/* Bloque 1: datos (en una fila desde sm) */}
        <div className="grid gap-4 sm:grid-cols-[3fr_2fr]">
        <div>
          <Label htmlFor="nombre" required>
            Nombre de la farmacia
          </Label>
          <Input
            id="nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="off"
            required
            invalid={Boolean(errorNombre)}
            aria-describedby={errorNombre ? 'nombre-error' : undefined}
          />
          {errorNombre && (
            <p id="nombre-error" className="help help-error" role="alert">
              {errorNombre}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="ciudad">Ciudad</Label>
          <Input
            id="ciudad"
            name="ciudad"
            value={ciudad}
            onChange={(e) => setCiudad(e.target.value)}
            autoComplete="address-level2"
            invalid={Boolean(fieldError('ciudad'))}
            aria-describedby={fieldError('ciudad') ? 'ciudad-error' : undefined}
          />
          {fieldError('ciudad') && (
            <p id="ciudad-error" className="help help-error" role="alert">
              {fieldError('ciudad')}
            </p>
          )}
        </div>
        </div>

        <div className="border-t border-[var(--color-hairline)] pt-5">
        <LanguagePicker value={idiomas} onToggle={toggleIdioma} error={fieldError('idiomas')} />
        </div>

        <div className="border-t border-[var(--color-hairline)] pt-5">
        {responsables.length > 0 ? (
          <div>
            <Label htmlFor="responsable">Quién la gestiona (opcional)</Label>
            <Select
              id="responsable"
              name="responsable"
              defaultValue=""
              aria-describedby={fieldError('responsable') ? 'responsable-ayuda responsable-error' : 'responsable-ayuda'}
              aria-invalid={Boolean(fieldError('responsable'))}
              options={[
                { value: '', label: 'Nadie por ahora' },
                ...responsables.map((u) => ({
                  value: u.id,
                  label: u.nombre,
                  description: u.farmacias.length > 0 ? `${u.email} · ya lleva ${u.farmacias.join(', ')}` : u.email,
                })),
              ]}
            />
            <p id="responsable-ayuda" className="mt-1.5 mb-0 text-[13px] text-[var(--color-muted)]">
              Si ya lleva otras farmacias, esta se le suma a las que tiene.
            </p>
            {fieldError('responsable') && (
              <p id="responsable-error" className="help help-error" role="alert">
                {fieldError('responsable')}
              </p>
            )}
          </div>
        ) : (
          <p className="m-0 text-[13.5px] leading-[1.5] text-[var(--color-muted)]">
            Quién la gestiona: aún no hay usuarios. Puedes crearlo en Usuarios y asignarle la farmacia después.
          </p>
        )}
        </div>

        {/* Lo raro, al final y sin caja: el identificador se genera del nombre */}
        {/* Identificador: se genera del nombre; cambiarlo es raro → plegado */}
        <details
          open={avanzadas}
          onToggle={(e) => setAvanzadas((e.currentTarget as HTMLDetailsElement).open)}
          className="group"
        >
          <summary className="-mx-2 inline-flex min-h-11 sm:min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-[8px] px-2 text-[13.5px] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] [&::-webkit-details-marker]:hidden focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]">
            <NavIcon name="CaretRight" size={12} className="transition-transform group-open:rotate-90 motion-reduce:transition-none" />
            Opciones avanzadas
          </summary>
        <div className="pt-2">
          <p className="label m-0" id="slug-label">Identificador interno</p>
          <input type="hidden" name="slug" value={slugFinal} />
          {editandoSlug ? (
            <Input
              id="slug"
              aria-labelledby="slug-label"
              aria-describedby={fieldError('slug') ? 'slug-ayuda slug-error' : 'slug-ayuda'}
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
              className="font-mono-tabular mt-1"
              invalid={Boolean(fieldError('slug'))}
            />
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {slugFinal ? (
                <code className="rounded-[6px] bg-[var(--color-surface-sunken)] px-2.5 py-1.5 text-[14px] text-[var(--color-ink)]">
                  {slugFinal}
                </code>
              ) : (
                <span className="text-[14px] italic text-[var(--color-muted)]">Se genera al escribir el nombre</span>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                aria-describedby="slug-label"
                onClick={() => {
                  setSlug(slugFinal);
                  setEditandoSlug(true);
                  window.setTimeout(() => document.getElementById('slug')?.focus(), 0);
                }}
              >
                Cambiar
              </Button>
            </div>
          )}
          <p id="slug-ayuda" className="mt-1.5 mb-0 text-[13px] text-[var(--color-muted)]">
            Código con el que la web lee su contenido. Solo minúsculas, números y guiones.
          </p>
          {fieldError('slug') && (
            <p id="slug-error" className="help help-error" role="alert">
              {fieldError('slug')}
            </p>
          )}
        </div>
        </details>

        {state.status === 'error' && !CAMPOS.some((k) => state.fieldErrors?.[k]) && !state.fieldErrors?.ciudad && (
          <div role="alert" className="px-3 py-2.5 rounded-[6px] bg-[var(--color-red-soft)] text-[var(--color-red-ink)] text-[14px]">
            {state.message}
          </div>
        )}
      </form>
    </Modal>
  );
}
