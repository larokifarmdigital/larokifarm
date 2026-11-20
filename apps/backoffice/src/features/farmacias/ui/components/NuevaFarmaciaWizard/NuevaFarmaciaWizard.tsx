'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { LOCALES, type Locale } from '@/core/shared';
import type { ResponsableDisponible } from '@/core/farmacias/domain';
import { Button } from '@/shared/components/atoms/Button';
import { Input } from '@/shared/components/atoms/Input';
import { Label } from '@/shared/components/atoms/Label';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import { slugify } from '@/shared/lib/slugify';
import {
  createFarmaciaAction,
  type CreateFarmaciaState,
} from '@/features/farmacias/actions/farmaciaActions';
import { LanguagePicker } from './LanguagePicker';

/** Orden en que se enfoca el primer campo con error devuelto por el servidor. */
const CAMPOS = ['nombre', 'slug', 'idiomas', 'responsable'] as const;

/**
 * Alta de una farmacia en UN paso (antes eran 3 pasos para 4 campos):
 * nombre, ciudad, idiomas, identificador (generado; se puede cambiar) y
 * responsable opcional. Se crea como borrador.
 */
export function NuevaFarmaciaWizard({ responsables }: { responsables: ResponsableDisponible[] }) {
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

  // Si el servidor rechaza el identificador, se abre su campo (ajuste en render, no en effect).
  const [estadoVisto, setEstadoVisto] = useState(state);
  if (state !== estadoVisto) {
    setEstadoVisto(state);
    if (state.status === 'error' && state.fieldErrors?.slug) setEditandoSlug(true);
  }

  // Error del servidor: aviso + foco en el primer campo que falla.
  useEffect(() => {
    if (state.status !== 'error') return;
    const campo = CAMPOS.find((k) => state.fieldErrors?.[k]);
    toast.error(campo ? state.fieldErrors?.[campo] ?? state.message : state.message);
    if (campo) window.setTimeout(() => document.getElementById(campo === 'idiomas' ? 'idiomas-ca' : campo)?.focus(), 0);
  }, [state]);

  const toggleIdioma = (l: Locale) =>
    setIdiomas((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : LOCALES.filter((x) => x === l || prev.includes(x)),
    );

  return (
    <div>
      <header className="mb-6 sm:mb-8">
        <Link
          href="/farmacias"
          className="inline-flex min-h-11 sm:min-h-6 items-center gap-1 text-[13.5px] text-[var(--color-muted)] hover:text-[var(--color-ink-2)] transition-colors mb-3"
        >
          <NavIcon name="CaretRight" size={11} className="rotate-180" />
          Volver a farmacias
        </Link>
        <h1 className="h-display m-0">Añadir una farmacia</h1>
        <p className="mt-2 text-[14.5px] text-[var(--color-muted)] max-w-lg text-pretty">
          Solo lo esencial. Se crea como borrador y después completas horario, servicios y fotos.
        </p>
      </header>

      <form action={formAction} className="card p-5 sm:p-8 space-y-6" noValidate>
        <div>
          <Label htmlFor="nombre" required>
            Nombre de la farmacia
          </Label>
          <Input
            id="nombre"
            name="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
            autoComplete="off"
            invalid={Boolean(fieldError('nombre'))}
            aria-describedby={fieldError('nombre') ? 'nombre-error' : undefined}
          />
          {fieldError('nombre') && (
            <p id="nombre-error" className="help help-error" role="alert">
              {fieldError('nombre')}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="ciudad">Ciudad</Label>
          <Input id="ciudad" name="ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} autoComplete="address-level2" />
        </div>

        <LanguagePicker value={idiomas} onToggle={toggleIdioma} error={fieldError('idiomas')} />

        {/* Identificador: se genera del nombre; cambiarlo es raro */}
        <div>
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
              <code className="rounded-[6px] bg-[var(--color-surface-sunken)] px-2.5 py-1.5 text-[14px] text-[var(--color-ink)]">
                {slugFinal || 'se genera con el nombre'}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
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

        <div>
          <Label htmlFor="responsable">Quién la gestiona (opcional)</Label>
          <select
            id="responsable"
            name="responsable"
            defaultValue=""
            className="field"
            aria-describedby={fieldError('responsable') ? 'responsable-ayuda responsable-error' : 'responsable-ayuda'}
            aria-invalid={Boolean(fieldError('responsable')) || undefined}
          >
            <option value="">Nadie por ahora</option>
            {responsables.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre} · {u.email}
              </option>
            ))}
          </select>
          <p id="responsable-ayuda" className="mt-1.5 mb-0 text-[13px] text-[var(--color-muted)]">
            {responsables.length > 0
              ? 'Solo salen usuarios que todavía no tienen farmacia. Podrá editar su web.'
              : 'No hay usuarios sin farmacia asignada. Podrás asignarlo más adelante.'}
          </p>
          {fieldError('responsable') && (
            <p id="responsable-error" className="help help-error" role="alert">
              {fieldError('responsable')}
            </p>
          )}
        </div>

        {state.status === 'error' && !CAMPOS.some((k) => state.fieldErrors?.[k]) && (
          <div role="alert" className="px-3 py-2.5 rounded-[6px] bg-[var(--color-red-soft)] text-[var(--color-red-ink)] text-[14px]">
            {state.message}
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-5 border-t border-[var(--color-hairline)]">
          <Button type="button" variant="ghost" asChild>
            <Link href="/farmacias">Cancelar</Link>
          </Button>
          {/* aria-disabled (no disabled): sigue alcanzable con Tab y anuncia por qué no se puede crear */}
          <Button
            type="submit"
            variant="accent"
            disabled={pending}
            aria-disabled={!nombreOk || undefined}
            aria-describedby={!nombreOk ? 'crear-ayuda' : undefined}
            className={!nombreOk ? 'opacity-55 cursor-not-allowed' : undefined}
            onClick={(e) => {
              if (!nombreOk) {
                e.preventDefault();
                document.getElementById('nombre')?.focus();
              }
            }}
          >
            <NavIcon name="Check" size={14} />
            {pending ? 'Creando…' : 'Crear borrador'}
          </Button>
        </div>
        {!nombreOk && (
          <p id="crear-ayuda" className="m-0 -mt-3 text-right text-[13px] text-[var(--color-muted)]">
            Escribe el nombre para poder crearla.
          </p>
        )}
      </form>
    </div>
  );
}
