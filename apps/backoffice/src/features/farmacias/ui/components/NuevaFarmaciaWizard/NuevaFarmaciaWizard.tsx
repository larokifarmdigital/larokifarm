'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/core/shared';
import { Button } from '@/shared/components/atoms/Button';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { LabelHelpIcon } from '@/shared/components/molecules/LabelHelpIcon';
import { slugify } from '@/shared/lib/slugify';
import {
  createFarmaciaAction,
  type CreateFarmaciaState,
} from '@/features/farmacias/actions/farmaciaActions';
import { cn } from '@/shared/lib/cn';
import { LanguagePicker } from './LanguagePicker';

type Paso = 1 | 2 | 3;

const PASOS: { n: Paso; titulo: string; descripcion: string }[] = [
  { n: 1, titulo: 'Identidad', descripcion: 'Lo mínimo para que exista en el sistema.' },
  { n: 2, titulo: 'Idiomas', descripcion: 'En qué idiomas se verá la web. Puedes cambiarlo luego.' },
  { n: 3, titulo: 'Publicación', descripcion: 'Se crea como borrador para que la completes.' },
];

/** Paso donde vive cada campo, para volver a él si el server lo rechaza. */
const FIELD_STEP: Record<string, Paso> = { nombre: 1, slug: 1, idiomas: 2 };

/**
 * NOTE: los 3 pasos están SIEMPRE montados (los inactivos con `hidden`) para
 * que todos los campos viajen en el FormData del submit del paso 3.
 */
export function NuevaFarmaciaWizard() {
  const [paso, setPaso] = useState<Paso>(1);
  const [nombre, setNombre] = useState('');
  const [slug, setSlug] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [idiomas, setIdiomas] = useState<Locale[]>(['es']);
  const [state, formAction, pending] = useActionState<CreateFarmaciaState, FormData>(
    createFarmaciaAction,
    { status: 'idle' },
  );

  // Si el server devuelve errores de campo, volver al paso del primer error
  // (ajuste durante el render, no en un effect).
  const [handledState, setHandledState] = useState(state);
  const firstErrorField =
    state.status === 'error' ? Object.keys(state.fieldErrors ?? {}).find((k) => k in FIELD_STEP) : undefined;
  if (state !== handledState) {
    setHandledState(state);
    if (firstErrorField) setPaso(FIELD_STEP[firstErrorField]);
  }

  // Efectos de DOM tras el cambio de paso: aviso + foco en el campo con error.
  useEffect(() => {
    if (state.status !== 'error') return;
    const field = Object.keys(state.fieldErrors ?? {}).find((k) => k in FIELD_STEP);
    if (field) {
      toast.error(state.fieldErrors?.[field] ?? state.message);
      document.getElementById(field)?.focus();
    }
  }, [state]);

  const fieldError = (k: string) => (state.status === 'error' ? state.fieldErrors?.[k] : undefined);
  const paso1Ok = nombre.trim().length >= 2 && (slug || nombre).trim().length > 0;
  const toggleIdioma = (l: Locale) =>
    setIdiomas((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : LOCALES.filter((x) => x === l || prev.includes(x)),
    );

  return (
    <div>
      <header className="mb-8">
        <Link
          href="/farmacias"
          className="inline-flex items-center gap-1 text-[12.5px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] transition-colors mb-4"
        >
          <NavIcon name="CaretRight" size={11} className="rotate-180" />
          Volver a farmacias
        </Link>
        <p className="eyebrow mb-2">Nueva</p>
        <h1 className="h-display m-0">Añadir una farmacia</h1>
        <p className="mt-2 text-[14px] text-[var(--color-muted)] max-w-lg text-pretty">
          Rellena solo lo esencial. Podrás completar el contenido, servicios,
          imágenes y horarios en la siguiente pantalla.
        </p>
      </header>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6 sm:mb-8">
        {PASOS.map((p) => {
          const done = paso > p.n;
          const active = paso === p.n;
          return (
            <li key={p.n}>
              <div
                className={cn(
                  'card p-4 border transition-colors',
                  active
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                    : done
                      ? 'border-[var(--color-hairline-strong)]'
                      : 'opacity-60',
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center text-[12px] font-medium',
                      done
                        ? 'bg-[var(--color-accent)] text-white'
                        : active
                          ? 'bg-[var(--color-ink)] text-white'
                          : 'bg-[var(--color-surface-sunken)] text-[var(--color-muted)]',
                    )}
                  >
                    {done ? <NavIcon name="Check" size={12} /> : p.n}
                  </span>
                  <span className="text-[13px] font-medium text-[var(--color-ink)]">{p.titulo}</span>
                </div>
                <p className="mt-1.5 text-[11.5px] text-[var(--color-muted)] leading-[1.5]">
                  {p.descripcion}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <form action={formAction} className="card p-5 sm:p-8">
        {/* ── Paso 1: Identidad ─────────────────────────────────────── */}
        <div hidden={paso !== 1} className="space-y-5">
          <div>
            <Label htmlFor="nombre" required>
              Nombre comercial
            </Label>
            <Input
              id="nombre"
              name="nombre"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="Farmacia Torrents"
              autoFocus
              invalid={Boolean(fieldError('nombre'))}
            />
            {fieldError('nombre') && (
              <p className="help help-error" role="alert">
                {fieldError('nombre')}
              </p>
            )}
          </div>

          <div>
            <Label
              htmlFor="slug"
              required
              hint={<LabelHelpIcon>Se autocompleta desde el nombre. Solo minúsculas, números y guiones.</LabelHelpIcon>}
            >
              Slug (URL)
            </Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              placeholder="mi-farmacia"
              className="font-mono-tabular"
              invalid={Boolean(fieldError('slug'))}
            />
            <p className="help">
              Tu web:{' '}
              <code className="font-mono text-[11.5px] bg-[var(--color-surface-sunken)] px-1 py-0.5 rounded">
                larokifarm.com/{slug || 'tu-slug'}
              </code>
            </p>
            {fieldError('slug') && (
              <p className="help help-error" role="alert">
                {fieldError('slug')}
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
              placeholder="Barcelona, Huacho…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-hairline)]">
            <Button type="button" variant="ghost" asChild>
              <Link href="/farmacias">Cancelar</Link>
            </Button>
            <Button type="button" variant="secondary" disabled={!paso1Ok} onClick={() => setPaso(2)}>
              Continuar
              <NavIcon name="CaretRight" size={12} />
            </Button>
          </div>
        </div>

        {/* ── Paso 2: Idiomas ───────────────────────────────────────── */}
        <div hidden={paso !== 2} className="space-y-5">
          <LanguagePicker value={idiomas} onToggle={toggleIdioma} error={fieldError('idiomas')} />

          <div className="flex justify-between pt-4 border-t border-[var(--color-hairline)]">
            <Button type="button" variant="ghost" onClick={() => setPaso(1)}>
              <NavIcon name="CaretRight" size={12} className="rotate-180" />
              Atrás
            </Button>
            <Button type="button" variant="secondary" onClick={() => setPaso(3)}>
              Continuar
              <NavIcon name="CaretRight" size={12} />
            </Button>
          </div>
        </div>

        {/* ── Paso 3: Publicación ───────────────────────────────────── */}
        <div hidden={paso !== 3} className="space-y-6">
          <div>
            <h2 className="h-section m-0 text-[20px]">Todo listo</h2>
            <p className="mt-2 text-[13.5px] text-[var(--color-muted)]">
              Vamos a crear la farmacia como <strong>borrador</strong>. Podrás
              completar el contenido y publicarla cuando quieras.
            </p>
          </div>

          <div className="card p-5 bg-[var(--color-surface-2)]">
            <dl className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-[13px]">
              <dt className="text-[var(--color-muted)]">Nombre</dt>
              <dd className="text-[var(--color-ink)]">{nombre}</dd>
              <dt className="text-[var(--color-muted)]">URL</dt>
              <dd className="text-[var(--color-ink)] font-mono-tabular">larokifarm.com/{slug}</dd>
              {ciudad && (
                <>
                  <dt className="text-[var(--color-muted)]">Ciudad</dt>
                  <dd className="text-[var(--color-ink)]">{ciudad}</dd>
                </>
              )}
              <dt className="text-[var(--color-muted)]">Idiomas</dt>
              <dd className="text-[var(--color-ink)]">
                {idiomas.map((l) => LOCALE_LABELS[l]).join(' · ')}
              </dd>
              <dt className="text-[var(--color-muted)]">Estado inicial</dt>
              <dd>
                <span className="chip chip-yellow">Borrador</span>
              </dd>
            </dl>
          </div>

          {state.status === 'error' && !firstErrorField && (
            <div
              role="alert"
              className="px-3 py-2.5 rounded-[6px] bg-[var(--color-red-soft)] text-[var(--color-red-ink)] text-[13px]"
            >
              {state.message}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-[var(--color-hairline)]">
            <Button type="button" variant="ghost" onClick={() => setPaso(2)}>
              <NavIcon name="CaretRight" size={12} className="rotate-180" />
              Atrás
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              <NavIcon name="Check" size={13} />
              {pending ? 'Creando…' : 'Crear farmacia'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
