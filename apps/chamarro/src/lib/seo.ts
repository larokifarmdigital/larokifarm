import type { Farmacia, HorarioDia, ResumenResenas } from './sanity';
import { localizar } from './sanity';
import { LOCALE_DEFECTO, type Locale } from './i18n';

const DIA_A_SCHEMA: Record<HorarioDia['dia'], string> = {
  Mo: 'Monday',
  Tu: 'Tuesday',
  We: 'Wednesday',
  Th: 'Thursday',
  Fr: 'Friday',
  Sa: 'Saturday',
  Su: 'Sunday',
};

export function horariosAJsonLd(horarios?: HorarioDia[]) {
  if (!horarios?.length) return undefined;
  return horarios
    .filter((h) => !h.cerrado && h.apertura && h.cierre)
    .map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DIA_A_SCHEMA[h.dia],
      opens: h.apertura,
      closes: h.cierre,
    }));
}

export function farmaciaAJsonLd(
  farmacia: Farmacia,
  siteUrl: string,
  locale: Locale = LOCALE_DEFECTO,
  resumenResenas?: ResumenResenas,
  incluirResenas = true,
) {
  const direccion = farmacia.direccion;
  const contacto = farmacia.contacto;

  const descripcion = localizar(farmacia.descripcionCorta, locale);

  const imagenes = [
    ...((farmacia.imagenes ?? []).map((i) => i.url)),
    ...((farmacia.imagenesSobre ?? []).map((i) => i.url)),
    farmacia.seo?.imagenOg?.asset?.url,
  ].filter((u): u is string => Boolean(u));
  const imagenesUnicas = Array.from(new Set(imagenes));

  const areaServed = [direccion?.ciudad, direccion?.provincia]
    .filter((v): v is string => Boolean(v))
    .map((nombre) => ({ '@type': 'City', name: nombre }));

  const faqs = (farmacia.faqs ?? [])
    .map((f) => ({
      pregunta: localizar(f.pregunta, locale),
      respuesta: localizar(f.respuesta, locale),
    }))
    .filter((f): f is { pregunta: string; respuesta: string } =>
      Boolean(f.pregunta && f.respuesta),
    );

  const aggregateRating =
    incluirResenas && resumenResenas && resumenResenas.total > 0 && resumenResenas.media > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(resumenResenas.media.toFixed(1)),
          reviewCount: resumenResenas.total,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined;

  const reviews = incluirResenas
    ? [
        ...(resumenResenas?.destacadas ?? []),
        ...(resumenResenas?.recientes ?? []),
      ]
        .slice(0, 10)
        .map((r) => ({
          '@type': 'Review',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: r.rating,
            bestRating: 5,
            worstRating: 1,
          },
          author: { '@type': 'Person', name: r.autorNombre || 'Anónimo' },
          datePublished: r.fechaPublicacion,
          reviewBody: r.comentario,
          inLanguage: r.comentarioIdioma,
        }))
    : [];

  const pharmacy = {
    '@context': 'https://schema.org',
    '@type': 'Pharmacy',
    '@id': `${siteUrl}/#farmacia`,
    name: farmacia.nombre,
    alternateName:
      farmacia.googleLocationName && farmacia.googleLocationName !== farmacia.nombre
        ? farmacia.googleLocationName
        : undefined,
    description: descripcion,
    url: siteUrl,
    inLanguage: locale,
    telephone: contacto?.telefono,
    email: contacto?.email,
    image: imagenesUnicas.length > 0 ? imagenesUnicas : undefined,
    logo: farmacia.logo,
    priceRange: '€€',
    address: direccion
      ? {
          '@type': 'PostalAddress',
          streetAddress: direccion.calle,
          postalCode: direccion.codigoPostal,
          addressLocality: direccion.ciudad,
          addressRegion: direccion.provincia,
          addressCountry: direccion.pais ?? 'ES',
        }
      : undefined,
    hasMap: farmacia.mapaUrl,
    areaServed: areaServed.length > 0 ? areaServed : undefined,
    openingHoursSpecification: horariosAJsonLd(farmacia.horarios),
    aggregateRating,
    review: reviews.length > 0 ? reviews : undefined,
    sameAs: [
      farmacia.redesSociales?.instagram,
      farmacia.redesSociales?.facebook,
      farmacia.redesSociales?.tiktok,
    ].filter(Boolean),
  };

  if (faqs.length === 0) return pharmacy;

  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${siteUrl}/#faqs`,
    inLanguage: locale,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.pregunta,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.respuesta,
      },
    })),
  };

  return [pharmacy, faqPage];
}

export type MetaSeo = {
  titulo: string;
  descripcion?: string;
  canonical: string;
  imagenOg?: string;
};

export function construirMetaSeo(
  farmacia: Farmacia,
  siteUrl: string,
  locale: Locale = LOCALE_DEFECTO,
  pathname = '/',
): MetaSeo {
  const ciudad = farmacia.direccion?.ciudad;
  const tituloPorDefecto = ciudad
    ? `${farmacia.nombre} · Farmacia en ${ciudad}`
    : farmacia.nombre;
  const tituloSeo = localizar(farmacia.seo?.titulo, locale) || tituloPorDefecto;
  const descripcion = localizar(farmacia.descripcionCorta, locale);
  const canonicalPath = pathname.replace(/\/$/, '') || '';
  return {
    titulo: tituloSeo,
    descripcion,
    canonical: `${siteUrl}${canonicalPath}`,
    imagenOg: farmacia.seo?.imagenOg?.asset?.url,
  };
}
