import type { Farmacia, Locale, MultilangText } from '@/types/content';

export type SectionKey =
  | 'hero'
  | 'features'
  | 'sobre'
  | 'servicios'
  | 'faqs'
  | 'resenas'
  | 'legal'
  | 'seo';

export const SECTION_LABELS: Record<SectionKey, string> = {
  hero: 'Hero',
  features: 'Features',
  sobre: 'Sobre',
  servicios: 'Servicios',
  faqs: 'FAQs',
  resenas: 'Reseñas',
  legal: 'Legal',
  seo: 'SEO',
};

/**
 * Estado de un campo i18n visto desde un idioma concreto:
 * - `filled`  → el campo tiene contenido en este idioma.
 * - `missing` → vacío en este idioma pero LLENO en otro idioma activo → inconsistente.
 * - `empty`   → vacío en este idioma y en el resto de idiomas activos → opcional.
 */
export type LocaleStatus = 'filled' | 'missing' | 'empty';

function isFilled(v: string | undefined | null): boolean {
  if (!v) return false;
  // Tiptap emite '<p></p>' cuando está vacío
  return v.replace(/<[^>]+>/g, '').trim().length > 0;
}

export function computeLocaleStatus(
  value: MultilangText | undefined,
  locale: Locale,
  activeLocales: readonly Locale[],
): LocaleStatus {
  const own = isFilled(value?.[locale]);
  if (own) return 'filled';
  const anyOther = activeLocales.some((l) => l !== locale && isFilled(value?.[l]));
  return anyOther ? 'missing' : 'empty';
}

/**
 * Recorre todos los campos i18n de una Farmacia y cuenta los estados desde
 * un idioma concreto. Usado por LangTabs para dibujar el contador de la pestaña.
 */
export function countLocaleStatus(
  farmacia: Farmacia,
  locale: Locale,
): { total: number; filled: number; missing: number; empty: number } {
  const active = farmacia.idiomasActivos;
  let total = 0;
  let filled = 0;
  let missing = 0;
  let empty = 0;

  const track = (v: MultilangText | undefined) => {
    total++;
    const s = computeLocaleStatus(v, locale, active);
    if (s === 'filled') filled++;
    else if (s === 'missing') missing++;
    else empty++;
  };

  track(farmacia.descripcionCorta);
  track(farmacia.descripcionLarga);
  track(farmacia.heroChip);
  track(farmacia.heroSubtitulo);

  for (const t of farmacia.heroTarjetasFlotantes ?? []) {
    track(t.titulo);
    track(t.subtitulo);
  }
  for (const f of farmacia.featuresLista ?? []) {
    track(f.titulo);
    if (f.descripcion) track(f.descripcion);
  }

  const sobre = farmacia.sobreNosotros;
  if (sobre) {
    if (sobre.chip !== undefined) track(sobre.chip);
    if (sobre.titulo !== undefined) track(sobre.titulo);
    for (const p of sobre.puntos ?? []) track(p);
  }

  for (const s of farmacia.servicios) {
    track(s.nombre);
    if (s.descripcion) track(s.descripcion);
  }
  const ts = farmacia.textosServicios;
  if (ts) {
    if (ts.chip) track(ts.chip);
    if (ts.titulo) track(ts.titulo);
    if (ts.subtitulo) track(ts.subtitulo);
  }

  for (const q of farmacia.faqs) {
    track(q.pregunta);
    track(q.respuesta);
  }
  const tf = farmacia.textosFaqs;
  if (tf) {
    if (tf.chip) track(tf.chip);
    if (tf.titulo) track(tf.titulo);
    if (tf.subtitulo) track(tf.subtitulo);
  }

  const tr = farmacia.textosResenas;
  if (tr) {
    if (tr.chip) track(tr.chip);
    if (tr.titulo) track(tr.titulo);
    if (tr.subtitulo) track(tr.subtitulo);
  }

  if (farmacia.avisoLegal) track(farmacia.avisoLegal);
  if (farmacia.politicaPrivacidad) track(farmacia.politicaPrivacidad);

  if (farmacia.seo?.title) track(farmacia.seo.title);
  if (farmacia.seo?.description) track(farmacia.seo.description);

  return { total, filled, missing, empty };
}

export type LocaleFieldCount = { total: number; filled: number; missing: number; empty: number };
export type SectionI18nStatus = {
  key: SectionKey;
  label: string;
  byLocale: Record<Locale, LocaleFieldCount>;
};

function newCount(): LocaleFieldCount {
  return { total: 0, filled: 0, missing: 0, empty: 0 };
}

/**
 * Devuelve el desglose de campos i18n agrupado por sección del editor.
 * Para cada sección, cuenta el estado (filled/missing/empty) por cada idioma activo.
 * El popover del EditorHealthChip lo usa para listar qué sección tiene traducciones
 * pendientes y a qué idioma saltar.
 */
export function countBySection(farmacia: Farmacia): SectionI18nStatus[] {
  const active = farmacia.idiomasActivos;

  const mk = (key: SectionKey): SectionI18nStatus => ({
    key,
    label: SECTION_LABELS[key],
    byLocale: active.reduce(
      (acc, l) => ({ ...acc, [l]: newCount() }),
      {} as Record<Locale, LocaleFieldCount>,
    ),
  });

  const sections: Record<SectionKey, SectionI18nStatus> = {
    hero: mk('hero'),
    features: mk('features'),
    sobre: mk('sobre'),
    servicios: mk('servicios'),
    faqs: mk('faqs'),
    resenas: mk('resenas'),
    legal: mk('legal'),
    seo: mk('seo'),
  };

  const trackIn = (sec: SectionKey, v: MultilangText | undefined) => {
    for (const l of active) {
      const c = sections[sec].byLocale[l];
      c.total++;
      const s = computeLocaleStatus(v, l, active);
      if (s === 'filled') c.filled++;
      else if (s === 'missing') c.missing++;
      else c.empty++;
    }
  };

  // Hero
  trackIn('hero', farmacia.heroChip);
  trackIn('hero', farmacia.heroSubtitulo);
  trackIn('hero', farmacia.descripcionCorta);
  for (const t of farmacia.heroTarjetasFlotantes ?? []) {
    trackIn('hero', t.titulo);
    trackIn('hero', t.subtitulo);
  }

  // Features
  for (const f of farmacia.featuresLista ?? []) {
    trackIn('features', f.titulo);
    if (f.descripcion) trackIn('features', f.descripcion);
  }

  // Sobre
  const sobre = farmacia.sobreNosotros;
  if (sobre) {
    if (sobre.chip !== undefined) trackIn('sobre', sobre.chip);
    if (sobre.titulo !== undefined) trackIn('sobre', sobre.titulo);
    for (const p of sobre.puntos ?? []) trackIn('sobre', p);
  }
  trackIn('sobre', farmacia.descripcionLarga);

  // Servicios
  for (const s of farmacia.servicios) {
    trackIn('servicios', s.nombre);
    if (s.descripcion) trackIn('servicios', s.descripcion);
  }
  if (farmacia.textosServicios) {
    if (farmacia.textosServicios.chip) trackIn('servicios', farmacia.textosServicios.chip);
    if (farmacia.textosServicios.titulo) trackIn('servicios', farmacia.textosServicios.titulo);
    if (farmacia.textosServicios.subtitulo) trackIn('servicios', farmacia.textosServicios.subtitulo);
  }

  // FAQs
  for (const q of farmacia.faqs) {
    trackIn('faqs', q.pregunta);
    trackIn('faqs', q.respuesta);
  }
  if (farmacia.textosFaqs) {
    if (farmacia.textosFaqs.chip) trackIn('faqs', farmacia.textosFaqs.chip);
    if (farmacia.textosFaqs.titulo) trackIn('faqs', farmacia.textosFaqs.titulo);
    if (farmacia.textosFaqs.subtitulo) trackIn('faqs', farmacia.textosFaqs.subtitulo);
  }

  // Reseñas (solo textos de cabecera — las reviews vienen de Google)
  if (farmacia.textosResenas) {
    if (farmacia.textosResenas.chip) trackIn('resenas', farmacia.textosResenas.chip);
    if (farmacia.textosResenas.titulo) trackIn('resenas', farmacia.textosResenas.titulo);
    if (farmacia.textosResenas.subtitulo) trackIn('resenas', farmacia.textosResenas.subtitulo);
  }

  // Legal
  if (farmacia.avisoLegal) trackIn('legal', farmacia.avisoLegal);
  if (farmacia.politicaPrivacidad) trackIn('legal', farmacia.politicaPrivacidad);

  // SEO
  if (farmacia.seo?.title) trackIn('seo', farmacia.seo.title);
  if (farmacia.seo?.description) trackIn('seo', farmacia.seo.description);

  return Object.values(sections);
}
