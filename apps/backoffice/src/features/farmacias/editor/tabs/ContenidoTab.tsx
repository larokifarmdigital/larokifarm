'use client';

import { Label } from '@/components/ui/Label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useFarmaciaEditor } from '../EditorContext';
import { TiptapField } from '../TiptapField';
import { LocaleChip } from '../LocaleChip';
import { computeLocaleStatus } from '../i18nStatus';

export function ContenidoTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();

  return (
    <div className="space-y-10 max-w-3xl">
      <section aria-labelledby="sec-desc-larga">
        <SectionHeader
          id="sec-desc-larga"
          title="Sobre la farmacia"
          hint="Cuéntale al cliente la historia, la especialidad y por qué elegirte. Usa subtítulos, listas y enlaces cuando aporten claridad."
        />
        <Label
          hint={
            <LocaleChip
              locale={currentLocale}
              status={computeLocaleStatus(farmacia.descripcionLarga, currentLocale, farmacia.idiomasActivos)}
            />
          }
          className="mb-3"
        >
          Descripción larga
        </Label>
        <TiptapField
          value={farmacia.descripcionLarga[currentLocale] ?? ''}
          onChange={(html) =>
            patch({
              descripcionLarga: {
                ...farmacia.descripcionLarga,
                [currentLocale]: html,
              },
            })
          }
          placeholder="Escribe la descripción larga de tu farmacia…"
          minHeight={280}
        />
      </section>
    </div>
  );
}
