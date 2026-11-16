'use client';

import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { useFieldErrors } from '@/features/farmacias/ui/hooks/useFieldError';
import { rules } from '@/core/farmacias/domain';
import { Switch } from '@/shared/components/atoms/Switch';
import { ResenasManager } from './ResenasManager';
import { FieldError } from '@/features/farmacias/ui/components/editor/fields/FieldError';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import { Label } from '@/shared/components/atoms/Label';
import { IconInput } from '@/shared/components/atoms/IconInput';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import type { TextosCabecera } from '@/core/farmacias/domain';

export function ResenasTab() {
  const { farmacia, patch } = useFarmaciaEditor();
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

  return (
    <div className="space-y-10 max-w-3xl">
      {/* ============= VISIBILIDAD ============= */}
      <section aria-labelledby="sec-resenas-visibilidad">
        <div className="card flex items-start justify-between gap-4 p-4">
          <div className="min-w-0">
            <h3 id="sec-resenas-visibilidad" className="m-0 text-[14px] font-bold text-[var(--color-ink)]">
              <label htmlFor="mostrar-resenas" className="cursor-pointer">Mostrar reseñas en la web</label>
            </h3>
            <p id="mostrar-resenas-hint" className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[var(--color-muted-2)]">
              {visible
                ? 'La landing muestra la sección de reseñas, el enlace «Reseñas» del menú y la valoración media en Google.'
                : 'Oculto: la landing no muestra la sección de reseñas ni su página. Se aplica al publicar.'}
            </p>
          </div>
          <Switch
            id="mostrar-resenas"
            checked={visible}
            onCheckedChange={(v) => patch({ mostrarResenas: v })}
            aria-describedby="mostrar-resenas-hint"
          />
        </div>
      </section>

      <div className={visible ? 'space-y-10' : 'space-y-10 opacity-50'} aria-disabled={!visible || undefined}>
      {/* ============= TEXTOS DE CABECERA ============= */}
      <section aria-labelledby="sec-resenas-textos">
        <SectionHeader
          id="sec-resenas-textos"
          title="Textos de la sección"
          hint="Cabecera de la sección «Lo que dicen nuestros clientes» en la landing. Deja en blanco para usar el texto por defecto del sitio."
        />

        <div className="space-y-4">
          <MultilangInput
            label="Chip (etiqueta superior)"
            value={textos.chip ?? {}}
            onChange={(v) => setTexto('chip', v)}
            placeholder="Reseñas Google"
          />
          <MultilangInput
            label="Título"
            value={textos.titulo ?? {}}
            onChange={(v) => setTexto('titulo', v)}
            placeholder="Lo que dicen nuestros clientes"
            help="Las dos últimas palabras se resaltan automáticamente en la landing."
          />
          <MultilangTextarea
            label="Subtítulo"
            value={textos.subtitulo ?? {}}
            onChange={(v) => setTexto('subtitulo', v)}
            placeholder="Opiniones reales de personas que han pasado por la farmacia."
            rows={2}
          />
        </div>
      </section>

      <div className="hairline" />

      {/* ============= CONEXIÓN GOOGLE ============= */}
      <section aria-labelledby="sec-resenas-google">
        <SectionHeader
          id="sec-resenas-google"
          title="Conexión con Google"
          hint="Las reseñas se importan automáticamente desde Google Business Profile. En el backoffice solo se configuran los enlaces — no se editan ni se añaden manualmente."
        />

        <div className="space-y-4">
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
              Business Profile · Resource name
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
              Formato <code className="font-mono text-[11.5px] bg-[var(--color-surface-sunken)] px-1 py-0.5 rounded">accounts/&lt;accountId&gt;/locations/&lt;locationId&gt;</code>.
              Lo obtienes cuando Google apruebe el acceso a la Business Profile API.
            </p>
          </div>

          <div>
            <Label htmlFor="google-maps">URL pública de Google Maps</Label>
            <IconInput
              id="google-maps"
              type="url"
              icon={<NavIcon name="MapPin" size={15} />}
              label="URL pública de Google Maps"
              value={farmacia.googleMapsUrl ?? ''}
              onChange={(e) => patch({ googleMapsUrl: e.target.value })}
              placeholder="https://maps.google.com/?cid=..."
              {...mapsError.inputProps}
            />
            <FieldError {...mapsError} errorId={`${mapsError.errorId}-resenas`} />
            <p className="help">
              La usa la landing para el botón «Ver en Google». Cópiala desde
              maps.google.com → buscar la farmacia → «Compartir» → «Copiar enlace».
            </p>
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============= PREVIEW READ-ONLY ============= */}
      <ResenasManager />
      </div>
    </div>
  );
}
