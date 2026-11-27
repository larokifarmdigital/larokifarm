'use client';

import { useFarmaciaEditor } from '@/features/farmacias/ui/context/EditorContext';
import { MultilangInput } from '@/features/farmacias/ui/components/editor/fields/MultilangInput';
import { MultilangTextarea } from '@/features/farmacias/ui/components/editor/fields/MultilangTextarea';
import { ImageGalleryField } from '@/features/farmacias/ui/components/editor/fields/ImageGalleryField';
import { SectionHeader } from '@/shared/components/molecules/SectionHeader';
import { landingUrl } from '@/shared/lib/landingUrl';

export function SeoTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const seo = farmacia.seo ?? {};

  const titleValue = seo.title?.[currentLocale] ?? '';
  const web = landingUrl(farmacia.web);
  const dominio = web ? new URL(web).host : null;
  const descValue = seo.description?.[currentLocale] ?? '';

  return (
    <div className="space-y-10 max-w-3xl">
      <section aria-labelledby="sec-seo-textos">
        <SectionHeader
          id="sec-seo-textos"
          title="Cómo sale tu web en Google"
          hint="El título y la descripción que ve la gente al buscarte en Google. Obligatorios en castellano para publicar."
        />

        <div className="space-y-4">
          <MultilangInput
            label="Título en Google"
            required
            field="seo.title.es"
            value={seo.title ?? {}}
            onChange={(v) => patch({ seo: { ...seo, title: v } })}
            placeholder="Farmàcia Torrents · Farmacia en el Eixample de Barcelona"
            help="Mejor entre 50 y 60 caracteres. También sale en la pestaña del navegador."
          />
          <MultilangTextarea
            label="Descripción en Google"
            required
            field="seo.description.es"
            value={seo.description ?? {}}
            onChange={(v) => patch({ seo: { ...seo, description: v } })}
            placeholder="Farmacia familiar en el Eixample con dermofarmacia, servicio a domicilio…"
            rows={3}
            limiteRecomendado={160}
            help="Mejor entre 150 y 160 caracteres: Google corta lo que pase de ahí."
          />
        </div>
      </section>

      <div className="hairline" />

      <section aria-labelledby="sec-seo-preview">
        <SectionHeader
          id="sec-seo-preview"
          title="Vista previa en Google"
          hint="Así se verá tu farmacia cuando alguien la busque."
        />
        <div className="card p-5 bg-white">
          <div className="text-[12px] text-[#5f6368]">
            {dominio ?? 'tu-dominio.com'}
          </div>
          <div className="text-[18px] leading-tight text-[#1a0dab] mt-0.5">
            {titleValue || farmacia.nombre}
          </div>
          <div className="text-[13px] text-[#4d5156] leading-[1.5] mt-1">
            {descValue ||
              farmacia.descripcionCorta[currentLocale] ||
              'Escribe una descripción corta para verla aquí.'}
          </div>
        </div>
      </section>
      <div className="hairline" />

      <section aria-labelledby="sec-seo-og">
        <SectionHeader
          id="sec-seo-og"
          required
          title="Imagen al compartir"
          hint="La que sale al compartir tu web por WhatsApp, Facebook o LinkedIn. Horizontal, de 1200×630, en JPG o PNG. Es la misma en todos los idiomas."
        />

        <ImageGalleryField
          mode="single"
          businessId={farmacia.id}
          role="og"
          field="seo.ogImage"
          aspect="og"
          value={seo.ogImage}
          onChange={(ogImage) =>
            patch({ seo: { ...seo, ogImage: ogImage ?? undefined } })
          }
        />
      </section>
    </div>
  );
}
