'use client';

import { CampoSinPublicar } from '@/features/farmacias/ui/components/editor/fields/CampoSinPublicar';
import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { TiptapField } from '@/features/farmacias/ui/components/editor/fields/TiptapField';
import { LocaleChip } from '@/features/farmacias/ui/components/editor/status/LocaleChip';
import { computeLocaleStatus } from '@/features/farmacias/ui/lib/i18nStatus';
import { Label } from '@/shared/components/atoms/Label';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { NavIcon } from '@/shared/components/atoms/NavIcon';
import type { Locale, MultilangText } from '@/core/shared';

function isEmptyLocale(v: MultilangText | undefined, locale: Locale) {
  if (!v) return true;
  const html = v[locale];
  if (!html) return true;
  // Tiptap emits '<p></p>' cuando está vacío
  return html.replace(/<[^>]+>/g, '').trim().length === 0;
}

function FallbackNote({ empty }: { empty: boolean }) {
  if (!empty) return null;
  return (
    <div className="mt-2 flex items-start gap-2 rounded-[6px] bg-[var(--color-yellow-soft)] px-3 py-2 text-[12px] text-[var(--color-yellow-ink)] leading-[1.5]">
      <NavIcon name="Info" size={13} className="mt-0.5 shrink-0" />
      <span>
        Vacío en este idioma. La landing mostrará el texto legal por defecto del sitio hasta que rellenes este campo.
      </span>
    </div>
  );
}

export function LegalTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();

  const setAviso = (html: string) =>
    patch({ avisoLegal: { ...(farmacia.avisoLegal ?? {}), [currentLocale]: html } });
  const setPolitica = (html: string) =>
    patch({ politicaPrivacidad: { ...(farmacia.politicaPrivacidad ?? {}), [currentLocale]: html } });

  const avisoEmpty = isEmptyLocale(farmacia.avisoLegal, currentLocale);
  const politicaEmpty = isEmptyLocale(farmacia.politicaPrivacidad, currentLocale);
  const avisoStatus = computeLocaleStatus(farmacia.avisoLegal, currentLocale, farmacia.idiomasActivos);
  const politicaStatus = computeLocaleStatus(farmacia.politicaPrivacidad, currentLocale, farmacia.idiomasActivos);

  return (
    <div className="space-y-10 max-w-3xl">
      {/* data-pagina-vista-previa: la vista previa enseña la página del texto que se edita */}
      <CampoSinPublicar campo="avisoLegal" soloBorde>
        <section aria-labelledby="sec-legal-aviso" data-pagina-vista-previa="aviso-legal">
          <SectionHeader
            id="sec-legal-aviso"
            title="Aviso legal"
            hint="Texto completo del aviso legal de esta farmacia. Obligatorio en castellano para publicar; en otros idiomas, si está vacío, la web muestra el texto por defecto."
          />
          <Label
            hint={<LocaleChip locale={currentLocale} status={avisoStatus} />}
            className="mb-3"
            required
          >
            Cuerpo del aviso legal
          </Label>
          <TiptapField
            field="avisoLegal.es"
            label="Cuerpo del aviso legal"
            value={farmacia.avisoLegal?.[currentLocale] ?? ''}
            onChange={setAviso}
            placeholder="Datos identificativos, política de cookies, propietario del sitio, licencia…"
            minHeight={260}
          />
          <FallbackNote empty={avisoEmpty && currentLocale !== 'es'} />
        </section>
      </CampoSinPublicar>

      <div className="hairline" />

      <CampoSinPublicar campo="politicaPrivacidad" soloBorde>
        <section aria-labelledby="sec-legal-privacidad" data-pagina-vista-previa="politica-privacidad">
          <SectionHeader
            id="sec-legal-privacidad"
            title="Política de privacidad"
            hint="Texto completo de la política de privacidad. Obligatoria en castellano para publicar; en otros idiomas, si está vacía, la web muestra el texto por defecto."
          />
          <Label
            hint={<LocaleChip locale={currentLocale} status={politicaStatus} />}
            className="mb-3"
            required
          >
            Cuerpo de la política
          </Label>
          <TiptapField
            field="politicaPrivacidad.es"
            label="Cuerpo de la política de privacidad"
            value={farmacia.politicaPrivacidad?.[currentLocale] ?? ''}
            onChange={setPolitica}
            placeholder="Datos que se recogen, finalidad, derechos ARCO, responsable del tratamiento…"
            minHeight={260}
          />
          <FallbackNote empty={politicaEmpty && currentLocale !== 'es'} />
        </section>
      </CampoSinPublicar>
    </div>
  );
}
