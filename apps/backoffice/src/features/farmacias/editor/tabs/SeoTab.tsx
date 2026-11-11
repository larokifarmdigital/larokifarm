'use client';

import { useFarmaciaEditor } from '../EditorContext';
import { MultilangInput } from '../MultilangInput';
import { MultilangTextarea } from '../MultilangTextarea';
import { ImageGalleryField } from '../ImageGalleryField';
import { SectionHeader } from '@/components/ui/SectionHeader';

export function SeoTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const seo = farmacia.seo ?? {};

  const titleValue = seo.title?.[currentLocale] ?? '';
  const descValue = seo.description?.[currentLocale] ?? '';

  return (
    <div className="space-y-10 max-w-3xl">
      {/* ============= TÍTULO Y DESCRIPCIÓN ============= */}
      <section aria-labelledby="sec-seo-textos">
        <SectionHeader
          id="sec-seo-textos"
          title="Título y descripción"
          hint="Textos que aparecen en la pestaña del navegador y en los resultados de Google. Si los dejas vacíos, se usan el nombre y la descripción corta como fallback."
        />

        <div className="space-y-4">
          <MultilangInput
            label="Título SEO (title tag)"
            value={seo.title ?? {}}
            onChange={(v) => patch({ seo: { ...seo, title: v } })}
            placeholder="Farmàcia Torrents · Farmacia en el Eixample de Barcelona"
            help="Recomendado: 50-60 caracteres."
          />
          <MultilangTextarea
            label="Descripción SEO (meta description)"
            value={seo.description ?? {}}
            onChange={(v) => patch({ seo: { ...seo, description: v } })}
            placeholder="Farmacia familiar en el Eixample con dermofarmacia, servicio a domicilio…"
            rows={3}
            maxLength={160}
            help="Recomendado: 150-160 caracteres."
          />
        </div>
      </section>

      <div className="hairline" />

      {/* ============= IMAGEN OG ============= */}
      <section aria-labelledby="sec-seo-og">
        <SectionHeader
          id="sec-seo-og"
          title="Imagen Open Graph"
          hint="Se muestra al compartir la landing en WhatsApp, Facebook, LinkedIn, etc. Formato 1200×630 px (relación 1.91:1), JPG o PNG, menos de 1 MB. Compartida entre idiomas."
        />

        <ImageGalleryField
          mode="single"
          businessId={farmacia.id}
          role="og"
          aspect="og"
          value={seo.ogImage}
          onChange={(ogImage) =>
            patch({ seo: { ...seo, ogImage: ogImage ?? undefined } })
          }
        />
      </section>

      <div className="hairline" />

      {/* ============= PREVIEW GOOGLE ============= */}
      <section aria-labelledby="sec-seo-preview">
        <SectionHeader
          id="sec-seo-preview"
          title="Vista previa en Google"
          hint="Así se verá tu farmacia cuando alguien la busque."
        />
        <div className="card p-5 bg-white">
          <div className="text-[12px] text-[#5f6368]">
            larokifarm.com › {farmacia.slug}
          </div>
          <div className="text-[18px] leading-tight text-[#1a0dab] hover:underline cursor-pointer mt-0.5">
            {titleValue || farmacia.nombre}
          </div>
          <div className="text-[13px] text-[#4d5156] leading-[1.5] mt-1">
            {descValue ||
              farmacia.descripcionCorta[currentLocale] ||
              'Escribe una descripción corta para verla aquí.'}
          </div>
        </div>
      </section>
    </div>
  );
}
