'use client';

import { useFarmaciaEditor } from '../EditorContext';
import { MultilangInput } from '../MultilangInput';
import { MultilangTextarea } from '../MultilangTextarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { IconInput } from '@/components/ui/IconInput';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { NavIcon } from '@/features/shell/NavIcon';
import type { TextosCabecera } from '@/types/content';

export function ResenasTab() {
  const { farmacia, patch } = useFarmaciaEditor();
  const textos: TextosCabecera = farmacia.textosResenas ?? {};

  const setTexto = (field: keyof TextosCabecera, value: TextosCabecera[keyof TextosCabecera]) => {
    patch({ textosResenas: { ...textos, [field]: value } });
  };

  const locationOk = farmacia.googleLocationName
    ? /^accounts\/\d+\/locations\/\d+$/.test(farmacia.googleLocationName)
    : null;
  const mediaResenas = farmacia.resenas.length > 0
    ? (farmacia.resenas.reduce((a, r) => a + r.puntuacion, 0) / farmacia.resenas.length).toFixed(1)
    : null;

  return (
    <div className="space-y-10 max-w-3xl">
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
              invalid={locationOk === false}
            />
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
            />
            <p className="help">
              La usa la landing para el botón «Ver en Google». Cópiala desde
              maps.google.com → buscar la farmacia → «Compartir» → «Copiar enlace».
            </p>
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============= PREVIEW READ-ONLY ============= */}
      <section aria-labelledby="sec-resenas-preview">
        <SectionHeader
          id="sec-resenas-preview"
          title="Reseñas sincronizadas"
          hint="Vista de solo lectura. Las reseñas se refrescan automáticamente cada 24h desde Google."
          actions={
            mediaResenas && (
              <div className="flex items-center gap-4 text-[12px]">
                <span className="text-[var(--color-muted)]">
                  Media <strong className="font-mono-tabular text-[var(--color-ink)] text-[13px]">{mediaResenas}</strong>/5
                </span>
                <span className="text-[var(--color-muted)]">
                  Total <strong className="font-mono-tabular text-[var(--color-ink)] text-[13px]">{farmacia.resenas.length}</strong>
                </span>
              </div>
            )
          }
        />

        {farmacia.resenas.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center mb-3">
              <NavIcon name="ChatCircleText" size={18} className="text-[var(--color-muted)]" />
            </div>
            <p className="text-[13.5px] text-[var(--color-ink-2)] m-0">Aún no hay reseñas sincronizadas.</p>
            <p className="mt-1 text-[12px] text-[var(--color-muted)] m-0">
              Cuando conectemos la Business Profile API, aparecerán aquí automáticamente.
            </p>
          </div>
        ) : (
          <ul className="space-y-2 list-none p-0 m-0">
            {farmacia.resenas.map((r) => (
              <li key={r.id} className="card p-4 flex items-start gap-3">
                <div className="shrink-0 h-9 w-9 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center text-[12px] font-medium text-[var(--color-ink-2)]">
                  {r.autor.slice(0, 2).toUpperCase() || '—'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13.5px] font-medium text-[var(--color-ink)]">{r.autor || 'Anónimo'}</span>
                    <span aria-label={`${r.puntuacion} de 5 estrellas`} className="text-[12px] text-[#f7b500]">
                      {'★'.repeat(r.puntuacion)}
                      <span className="text-[var(--color-hairline-strong)]">{'★'.repeat(5 - r.puntuacion)}</span>
                    </span>
                    <span className="text-[11px] font-mono-tabular text-[var(--color-muted-2)] ml-auto">
                      {r.fecha.slice(0, 10)}
                    </span>
                  </div>
                  <p className="text-[13px] text-[var(--color-ink-2)] leading-[1.55] mt-1 mb-0">{r.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
