'use client';

import { useFarmaciaEditor } from '../EditorContext';
import { TiptapField } from '../TiptapField';
import { LocaleChip } from '../LocaleChip';
import { computeLocaleStatus } from '../i18nStatus';
import { Label } from '@/components/ui/Label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { NavIcon } from '@/features/shell/NavIcon';
import type { Locale, MultilangText } from '@/types/content';

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
      {/* ============= AVISO LEGAL ============= */}
      <section aria-labelledby="sec-legal-aviso">
        <SectionHeader
          id="sec-legal-aviso"
          title="Aviso legal"
          hint="Texto completo del aviso legal específico de esta farmacia. Si lo dejas vacío, la landing usa el aviso legal por defecto del sitio."
        />
        <Label
          hint={<LocaleChip locale={currentLocale} status={avisoStatus} />}
          className="mb-3"
        >
          Cuerpo del aviso legal
        </Label>
        <TiptapField
          value={farmacia.avisoLegal?.[currentLocale] ?? ''}
          onChange={setAviso}
          placeholder="Datos identificativos, política de cookies, propietario del sitio, licencia…"
          minHeight={260}
        />
        <FallbackNote empty={avisoEmpty} />
      </section>

      <div className="hairline" />

      {/* ============= POLÍTICA DE PRIVACIDAD ============= */}
      <section aria-labelledby="sec-legal-privacidad">
        <SectionHeader
          id="sec-legal-privacidad"
          title="Política de privacidad"
          hint="Texto completo de la política de privacidad. Si lo dejas vacío, la landing usa la política por defecto del sitio."
        />
        <Label
          hint={<LocaleChip locale={currentLocale} status={politicaStatus} />}
          className="mb-3"
        >
          Cuerpo de la política
        </Label>
        <TiptapField
          value={farmacia.politicaPrivacidad?.[currentLocale] ?? ''}
          onChange={setPolitica}
          placeholder="Datos que se recogen, finalidad, derechos ARCO, responsable del tratamiento…"
          minHeight={260}
        />
        <FallbackNote empty={politicaEmpty} />
      </section>
    </div>
  );
}
