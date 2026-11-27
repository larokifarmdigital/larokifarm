'use client';

import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { useFieldErrors } from '@/features/farmacias/ui/hooks/useFieldError';
import { rules } from '@/core/farmacias/domain';
import { Switch } from '@/shared/components/atoms/Switch';
import { ResenasManager } from './ResenasManager';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { CabeceraColapsable } from '@/features/farmacias/ui/components/editor/fields/FilaLista';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import { Label } from '@/shared/components/atoms/Label';
import { IconInput } from '@/shared/components/atoms/IconInput';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import type { TextosCabecera } from '@/core/farmacias/domain';

export function ResenasTab() {
  const { farmacia, patch, esAdmin } = useFarmaciaEditor();
  const textos: TextosCabecera = farmacia.textosResenas ?? {};

  const setTexto = (field: keyof TextosCabecera, value: TextosCabecera[keyof TextosCabecera]) => {
    patch({ textosResenas: { ...textos, [field]: value } });
  };

  const fieldError = useFieldErrors();
  const locationError = fieldError('googleLocationName');
  const mapsError = fieldError('googleMapsUrl');
  // Chip verde/rojo junto al label: estado del formato (vacío = sin chip).
  const locationOk = farmacia.googleLocationName?.trim()
    ? rules.googleLocationName(farmacia.googleLocationName) === null
    : null;

  const visible = farmacia.mostrarResenas;
  const resumen = [textos.chip?.es, textos.titulo?.es].filter(Boolean).join(' · ');

  return (
    <div className="space-y-10 max-w-3xl">
      {!visible && (
        <p className="m-0 rounded-[10px] bg-[var(--color-surface-sunken)] px-4 py-3 text-[14px] text-[var(--color-ink-2)]">
          Las reseñas están ocultas en tu web. Puedes preparar estos ajustes igualmente.
        </p>
      )}
      <div className="space-y-10">
      <section aria-labelledby="sec-resenas-google">
        <SectionHeader
          id="sec-resenas-google"
          title="Enlace con Google"
          hint="Las reseñas llegan solas desde Google: aquí no se escriben ni se añaden a mano."
        />

        <div className="space-y-4">
          {esAdmin && (
          <div>
            <Label
              htmlFor="google-location"
              hint={
                locationOk === true ? (
                  <span className="inline-flex items-center gap-1 text-[var(--color-green-ink)]">
                    <NavIcon name="Check" size={11} weight="bold" /> formato correcto
                  </span>
                ) : locationOk === false ? (
                  <span className="text-[var(--color-red-ink)]">formato inválido</span>
                ) : null
              }
            >
              Identificador de Google Business Profile
            </Label>
            <IconInput
              id="google-location"
              icon={<NavIcon name="IdentificationCard" size={15} />}
              label="Google Business Profile resource name"
              value={farmacia.googleLocationName ?? ''}
              onChange={(e) => patch({ googleLocationName: e.target.value })}
              placeholder="accounts/1234/locations/5678"
              className="font-mono-tabular"
              {...locationError.inputProps}
            />
            <FieldError {...locationError} />
            <p className="help">
              Formato <code className="font-mono text-[12px] text-[var(--color-ink)] bg-[var(--color-surface-sunken)] px-1 py-0.5 rounded">accounts/&lt;accountId&gt;/locations/&lt;locationId&gt;</code>.
              Lo obtienes cuando Google apruebe el acceso a la Business Profile API. Solo lo ve el administrador.
            </p>
          </div>
          )}

          <div>
            <Label htmlFor="google-maps">Enlace de Google Maps</Label>
            <IconInput
              id="google-maps"
              type="url"
              icon={<NavIcon name="MapPin" size={15} />}
              label="Enlace de Google Maps"
              value={farmacia.googleMapsUrl ?? ''}
              onChange={(e) => patch({ googleMapsUrl: e.target.value })}
              placeholder="https://maps.google.com/?cid=..."
              {...mapsError.inputProps}
            />
            <FieldError {...mapsError} errorId={`${mapsError.errorId}-resenas`} />
            <p className="help">
              Para el botón «Ver en Google». En Google Maps, busca tu farmacia → «Compartir» → «Copiar enlace».
            </p>
          </div>
        </div>
      </section>

      <div className="hairline" />

      <ResenasManager />

      <div className="hairline" />

      <section aria-label="Textos de la cabecera de Reseñas">
        <CabeceraColapsable resumen={resumen || 'Textos por defecto de la web'}>
          <p className="m-0 mb-4 text-[13.5px] text-[var(--color-muted)]">Si los dejas en blanco, tu web usa los textos por defecto.</p>
        <div className="space-y-4">
          <MultilangInput
            label="Etiqueta pequeña sobre el título"
            value={textos.chip ?? {}}
            onChange={(v) => setTexto('chip', v)}
            placeholder="Reseñas Google"
          />
          <MultilangInput
            label="Título"
            value={textos.titulo ?? {}}
            onChange={(v) => setTexto('titulo', v)}
            placeholder="Lo que dicen nuestros clientes"
            help="Las dos últimas palabras salen resaltadas en tu web."
          />
          <MultilangTextarea
            label="Subtítulo"
            value={textos.subtitulo ?? {}}
            onChange={(v) => setTexto('subtitulo', v)}
            placeholder="Opiniones reales de personas que han pasado por la farmacia."
            rows={2}
          />
        </div>
        </CabeceraColapsable>
      </section>

      </div>
    </div>
  );
}

/** Interruptor general: no depende del idioma, así que va ENCIMA de las pestañas de idioma. */
export function ResenasVisibilidad() {
  const { farmacia, patch } = useFarmaciaEditor();
  const visible = farmacia.mostrarResenas;
  return (
    <div className="mb-6">
      <section aria-labelledby="sec-resenas-visibilidad">
        <div className="card flex items-start justify-between gap-4 p-4">
          <div className="min-w-0">
            <h3 id="sec-resenas-visibilidad" className="m-0 text-[14px] font-bold text-[var(--color-ink)]">
              <label htmlFor="mostrar-resenas" className="cursor-pointer">Mostrar reseñas en la web</label>
            </h3>
            <p id="mostrar-resenas-hint" className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[var(--color-muted-2)]">
              {visible
                ? 'Tu web muestra las reseñas, el enlace «Reseñas» del menú y tu nota media en Google.'
                : 'Tu web no muestra las reseñas. El cambio se verá cuando publiques.'}
            </p>
          </div>
          <Switch
            id="mostrar-resenas"
            aria-label="Mostrar reseñas en la web"
            checked={visible}
            onCheckedChange={(v) => patch({ mostrarResenas: v })}
            aria-describedby="mostrar-resenas-hint"
          />
        </div>
      </section>

    </div>
  );
}
