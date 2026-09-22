'use client';

import Image from 'next/image';
import { useRef } from 'react';
import { useFarmaciaEditor } from '../EditorContext';
import { MultilangInput } from '../MultilangInput';
import { TiptapField } from '../TiptapField';
import { LocaleChip } from '../LocaleChip';
import { computeLocaleStatus } from '../i18nStatus';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { NavIcon } from '@/features/shell/NavIcon';
import type { ImagenAsset, MultilangText, SobreNosotros } from '@/types/content';

const MAX_PUNTOS = 8;
const RECOMENDADO_PUNTOS = 4;
const MAX_IMAGENES = 6;

function mockUpload(name: string): ImagenAsset {
  const seed = name.replace(/\W+/g, '-').toLowerCase() || `img-${Date.now()}`;
  return {
    id: `img_${Math.random().toString(36).slice(2, 10)}`,
    url: `https://picsum.photos/seed/${seed}/1600/1200`,
    alt: {},
  };
}

export function SobreTab() {
  const { farmacia, patch, currentLocale } = useFarmaciaEditor();
  const imgRef = useRef<HTMLInputElement>(null);
  const sobre: SobreNosotros = farmacia.sobreNosotros ?? {};
  const puntos = sobre.puntos ?? [];
  const imagenes = farmacia.imagenesSobre ?? [];

  const setSobre = (next: Partial<SobreNosotros>) =>
    patch({ sobreNosotros: { ...sobre, ...next } });

  const setPuntos = (next: MultilangText[]) => setSobre({ puntos: next });

  const addPunto = () => {
    if (puntos.length >= MAX_PUNTOS) return;
    setPuntos([...puntos, {}]);
  };
  const updatePunto = (i: number, v: MultilangText) =>
    setPuntos(puntos.map((p, idx) => (idx === i ? v : p)));
  const removePunto = (i: number) =>
    setPuntos(puntos.filter((_, idx) => idx !== i));
  const movePunto = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= puntos.length) return;
    const next = [...puntos];
    [next[i], next[j]] = [next[j], next[i]];
    setPuntos(next);
  };

  const addImg = (files: FileList | null) => {
    if (!files) return;
    const nuevas = Array.from(files).map((f) => mockUpload(f.name));
    patch({ imagenesSobre: [...imagenes, ...nuevas].slice(0, MAX_IMAGENES) });
  };
  const removeImg = (id: string) =>
    patch({ imagenesSobre: imagenes.filter((h) => h.id !== id) });
  const updateAlt = (id: string, alt: string) =>
    patch({
      imagenesSobre: imagenes.map((h) =>
        h.id === id ? { ...h, alt: { ...h.alt, [currentLocale]: alt } } : h,
      ),
    });

  const puntosCountHint =
    puntos.length === 0
      ? `Recomendado ${RECOMENDADO_PUNTOS}-6 puntos.`
      : puntos.length < RECOMENDADO_PUNTOS
        ? `${puntos.length}/${RECOMENDADO_PUNTOS} recomendados.`
        : `${puntos.length}/${MAX_PUNTOS} · máx ${MAX_PUNTOS}.`;

  return (
    <div className="space-y-10 max-w-3xl">
      {/* ============= TEXTOS ============= */}
      <section aria-labelledby="sec-sobre-textos">
        <SectionHeader
          id="sec-sobre-textos"
          title="Textos de la sección"
          hint="Chip, título y años de experiencia que se muestran en la cabecera de la sección «Sobre nosotros»."
        />

        <div className="space-y-4">
          <MultilangInput
            label="Chip (etiqueta superior)"
            value={sobre.chip ?? {}}
            onChange={(v) => setSobre({ chip: v })}
            placeholder="Sobre nosotros"
            help="Texto pequeño sobre el título. Por defecto: «Sobre nosotros»."
          />
          <MultilangInput
            label="Título"
            value={sobre.titulo ?? {}}
            onChange={(v) => setSobre({ titulo: v })}
            placeholder="Una farmacia para familias"
            help="Las dos últimas palabras se resaltan automáticamente en la landing."
          />
          <div>
            <Label htmlFor="anyos-experiencia" hint={<span className="text-[11px] text-[var(--color-muted-2)]">badge «+X años»</span>}>
              Años de experiencia
            </Label>
            <Input
              id="anyos-experiencia"
              type="number"
              min={0}
              max={200}
              value={sobre.anyosExperiencia ?? ''}
              onChange={(e) => {
                const raw = e.target.value;
                setSobre({ anyosExperiencia: raw === '' ? undefined : Number(raw) });
              }}
              placeholder="45"
              className="font-mono-tabular max-w-[180px]"
            />
            <p className="help">Si lo dejas vacío, no aparece badge en la landing.</p>
          </div>
        </div>
      </section>

      <div className="hairline" />

      {/* ============= PUNTOS ============= */}
      <section aria-labelledby="sec-sobre-puntos">
        <SectionHeader
          id="sec-sobre-puntos"
          title="Puntos destacados"
          hint={`Lista de frases cortas que resumen los valores de la farmacia. ${puntosCountHint}`}
          actions={
            <Button
              variant="accent"
              size="sm"
              onClick={addPunto}
              disabled={puntos.length >= MAX_PUNTOS}
            >
              <NavIcon name="Plus" size={13} />
              <span className="hidden sm:inline">Añadir punto</span>
              <span className="sm:hidden">Añadir</span>
            </Button>
          }
        />

        {puntos.length === 0 ? (
          <button
            type="button"
            onClick={addPunto}
            className="w-full card p-8 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--color-accent-soft)] flex items-center justify-center mb-3 text-[var(--color-accent)]">
              <NavIcon name="Plus" size={18} />
            </div>
            <p className="text-[13.5px] text-[var(--color-ink-2)] m-0">Añade tu primer punto destacado</p>
            <p className="mt-1 text-[12px] text-[var(--color-muted)] m-0">
              «Atención personalizada», «Servicio a domicilio», «Dermofarmacia especializada»…
            </p>
          </button>
        ) : (
          <ul className="card divide-y divide-[var(--color-hairline)] list-none m-0 p-0 overflow-hidden">
            {puntos.map((p, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2.5">
                <span className="shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)] text-[11px] font-mono-tabular font-medium">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <Input
                    aria-label={`Punto ${i + 1}`}
                    value={p[currentLocale] ?? ''}
                    onChange={(e) => updatePunto(i, { ...p, [currentLocale]: e.target.value })}
                    placeholder="Ej.: Atención personalizada desde 1978"
                    className="border-0 shadow-none px-0 py-0 h-8 bg-transparent focus:shadow-none"
                  />
                  <LocaleChip
                    locale={currentLocale}
                    status={computeLocaleStatus(p, currentLocale, farmacia.idiomasActivos)}
                  />
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => movePunto(i, -1)}
                    disabled={i === 0}
                    aria-label="Subir punto"
                    className="h-7 w-7 flex items-center justify-center rounded-[4px] text-[var(--color-muted-2)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <NavIcon name="CaretRight" size={11} className="-rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => movePunto(i, 1)}
                    disabled={i === puntos.length - 1}
                    aria-label="Bajar punto"
                    className="h-7 w-7 flex items-center justify-center rounded-[4px] text-[var(--color-muted-2)] hover:text-[var(--color-ink-2)] hover:bg-[var(--color-surface-sunken)] disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <NavIcon name="CaretRight" size={11} className="rotate-90" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removePunto(i)}
                    aria-label="Eliminar punto"
                    className="h-7 w-7 flex items-center justify-center rounded-[4px] text-[var(--color-muted)] hover:text-[var(--color-red-ink)] hover:bg-[var(--color-red-soft)]"
                  >
                    <NavIcon name="Trash" size={11} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="hairline" />

      {/* ============= DESCRIPCIÓN LARGA ============= */}
      <section aria-labelledby="sec-sobre-descripcion">
        <SectionHeader
          id="sec-sobre-descripcion"
          title="Descripción larga"
          hint="Cuerpo principal de la sección «Sobre nosotros» de la landing. Historia, especialidad y valores."
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
          Cuerpo
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
          placeholder="Escribe la descripción larga de la farmacia…"
          minHeight={220}
        />
      </section>

      <div className="hairline" />

      {/* ============= IMÁGENES ============= */}
      <section aria-labelledby="sec-sobre-imagenes">
        <SectionHeader
          id="sec-sobre-imagenes"
          title="Imágenes"
          hint={`Aparecen junto a la descripción en la landing. Entre 1 y ${MAX_IMAGENES} imágenes.`}
          actions={
            <>
              <input
                ref={imgRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addImg(e.target.files)}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => imgRef.current?.click()}
                disabled={imagenes.length >= MAX_IMAGENES}
              >
                <NavIcon name="Plus" size={13} />
                Añadir
              </Button>
            </>
          }
        />

        {imagenes.length === 0 ? (
          <button
            type="button"
            onClick={() => imgRef.current?.click()}
            className="w-full card p-8 text-center border-dashed cursor-pointer hover:border-[var(--color-accent)] transition-colors"
          >
            <div className="mx-auto w-10 h-10 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center mb-3">
              <NavIcon name="Image" size={18} className="text-[var(--color-muted)]" />
            </div>
            <p className="text-[13.5px] text-[var(--color-ink-2)] m-0">Sube 1-6 imágenes de la farmacia</p>
            <p className="mt-1 text-[12px] text-[var(--color-muted)] m-0">Interior, equipo, momento del día…</p>
          </button>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {imagenes.map((h, i) => (
              <div key={h.id} className="card overflow-hidden">
                <div className="relative aspect-[4/3] bg-[var(--color-surface-sunken)]">
                  <Image
                    src={h.url}
                    alt={h.alt[currentLocale] ?? ''}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute top-2 left-2 chip chip-neutral bg-white/90">
                    Imagen {i + 1}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImg(h.id)}
                    aria-label="Eliminar imagen"
                    className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-[6px] bg-white/90 hover:bg-white text-[var(--color-red-ink)]"
                  >
                    <NavIcon name="Trash" size={14} />
                  </button>
                </div>
                <div className="p-4">
                  <Label htmlFor={`alt-sobre-${h.id}`}>Alt (accesibilidad + SEO)</Label>
                  <Input
                    id={`alt-sobre-${h.id}`}
                    value={h.alt[currentLocale] ?? ''}
                    onChange={(e) => updateAlt(h.id, e.target.value)}
                    placeholder="Describe lo que se ve"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
