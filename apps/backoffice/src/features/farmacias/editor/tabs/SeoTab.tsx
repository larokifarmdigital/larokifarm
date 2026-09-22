'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { useFarmaciaEditor } from '../EditorContext';
import { MultilangInput } from '../MultilangInput';
import { MultilangTextarea } from '../MultilangTextarea';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { NavIcon } from '@/features/shell/NavIcon';
import type { ImagenAsset } from '@/types/content';

function mockUpload(name: string): ImagenAsset {
  const seed = name.replace(/\W+/g, '-').toLowerCase() || `og-${Date.now()}`;
  return {
    id: `og_${Math.random().toString(36).slice(2, 10)}`,
    url: `https://picsum.photos/seed/${seed}/1200/630`,
    alt: {},
  };
}

export function SeoTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const seo = farmacia.seo ?? {};
  const ogRef = useRef<HTMLInputElement>(null);

  const titleValue = seo.title?.[currentLocale] ?? '';
  const descValue = seo.description?.[currentLocale] ?? '';

  const setOg = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    patch({ seo: { ...seo, ogImage: mockUpload(files[0].name) } });
  };

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
          actions={
            <>
              <input
                ref={ogRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setOg(e.target.files)}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => ogRef.current?.click()}
              >
                <NavIcon name="Image" size={13} />
                {seo.ogImage ? 'Reemplazar' : 'Subir imagen'}
              </Button>
            </>
          }
        />

        {seo.ogImage ? (
          <div className="card overflow-hidden">
            <div className="relative aspect-[1200/630] bg-[var(--color-surface-sunken)]">
              <Image
                src={seo.ogImage.url}
                alt={seo.ogImage.alt[currentLocale] ?? 'Imagen Open Graph'}
                fill
                unoptimized
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => patch({ seo: { ...seo, ogImage: undefined } })}
                aria-label="Quitar imagen Open Graph"
                className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-[6px] bg-white/90 hover:bg-white text-[var(--color-red-ink)]"
              >
                <NavIcon name="Trash" size={14} />
              </button>
              <div className="absolute bottom-2 left-2 chip chip-neutral bg-white/90 font-mono-tabular">
                1200 × 630
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => ogRef.current?.click()}
            className="w-full card p-8 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center mb-3">
              <NavIcon name="Image" size={18} className="text-[var(--color-muted)]" />
            </div>
            <p className="text-[13.5px] text-[var(--color-ink-2)] m-0">Sube la imagen de compartir</p>
            <p className="mt-1 text-[12px] text-[var(--color-muted)] m-0">
              Si la dejas vacía, se usa la primera imagen del hero como fallback.
            </p>
          </button>
        )}
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
