import { createClient, type ClientConfig } from '@sanity/client';
import { LOCALE_DEFECTO, type Locale } from '@/lib/i18n';

function requerirEnv(nombre: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `[env] Falta la variable de entorno requerida: ${nombre}. ` +
        `Defínela en .env (local) o en las Environment variables del hosting.`,
    );
  }
  return valor;
}

const projectId = requerirEnv(
  'PUBLIC_SANITY_PROJECT_ID',
  import.meta.env.PUBLIC_SANITY_PROJECT_ID,
);
const dataset = requerirEnv(
  'PUBLIC_SANITY_DATASET',
  import.meta.env.PUBLIC_SANITY_DATASET,
);

const config: ClientConfig = {
  projectId,
  dataset,
  apiVersion: '2024-10-01',
  useCdn: false,
  perspective: 'published',
};

export const sanity = createClient(config);

export type DiaSemana = 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su';

export type IconoNombre =
  | 'heart' | 'heart-pulse' | 'pill' | 'syringe' | 'stethoscope'
  | 'thermometer' | 'baby' | 'droplet' | 'sun' | 'shield' | 'sparkles'
  | 'leaf' | 'brain' | 'activity' | 'award' | 'users' | 'star' | 'clock';

export type PortableSpan = { _type: 'span'; text?: string; marks?: string[] };
export type PortableMarkDef = {
  _key: string;
  _type: string;
  href?: string;
  externo?: boolean;
};
export type PortableBlock = {
  _type: string;
  style?: string;
  listItem?: 'bullet' | 'number';
  level?: number;
  markDefs?: PortableMarkDef[];
  children?: PortableSpan[];
};

/**
 * Entrada de un campo internacionalizado (sanity-plugin-internationalized-array).
 * Persistido en Sanity como `[{ _key, language, value }]`.
 */
export type EntradaI18n<T> = {
  _key?: string;
  language: string;
  value?: T;
};

export type LocalizedString = EntradaI18n<string>[];
export type LocalizedText = EntradaI18n<string>[];
export type LocalizedPortableText = EntradaI18n<PortableBlock[]>[];

/**
 * Extrae el valor del idioma pedido. Fallback al idioma por defecto.
 * Si no hay nada, devuelve el primer valor con contenido.
 */
export function localizar<T>(
  entradas: EntradaI18n<T>[] | undefined | null,
  locale: Locale = LOCALE_DEFECTO,
): T | undefined {
  if (!Array.isArray(entradas) || entradas.length === 0) return undefined;
  const exacta = entradas.find((e) => e.language === locale);
  if (exacta && exacta.value !== undefined && exacta.value !== null) return exacta.value;
  if (locale !== LOCALE_DEFECTO) {
    const defecto = entradas.find((e) => e.language === LOCALE_DEFECTO);
    if (defecto && defecto.value !== undefined && defecto.value !== null) return defecto.value;
  }
  return entradas.find((e) => e.value !== undefined && e.value !== null)?.value;
}

export type HorarioDia = {
  dia: DiaSemana;
  apertura?: string;
  cierre?: string;
  cerrado?: boolean;
};

export type EnlaceServicio = {
  url?: string;
  nuevaPestana?: boolean;
};

export type Servicio = {
  nombre?: LocalizedString;
  descripcion?: LocalizedText;
  icono?: IconoNombre;
  enlace?: EnlaceServicio;
};

export type Direccion = {
  calle?: string;
  codigoPostal?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
};

export type SobreNosotros = {
  chip?: LocalizedString;
  titulo?: LocalizedString;
  anyosExperiencia?: number;
  puntos?: LocalizedString[];
};

export type Faq = {
  pregunta?: LocalizedString;
  respuesta?: LocalizedText;
};

export type ImagenConAlt = {
  url: string;
  alt?: LocalizedString;
};

export type Contacto = {
  telefono?: string;
  whatsapp?: string;
  email?: string;
  web?: string;
};

export type RedesSociales = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
};

export type SeoCampos = {
  titulo?: LocalizedString;
  imagenOg?: { asset: { url: string } };
};

export type LegalTexto = EntradaI18n<PortableBlock[]>[];

export type IdiomaActivo = { _id?: string; codigo: string; nombre: string };

/** Textos editables de la cabecera de una sección (chip + título + subtítulo). */
export type TextosCabecera = {
  chip?: LocalizedString;
  titulo?: LocalizedString;
  subtitulo?: LocalizedText;
};

export type TarjetaFlotante = {
  icono?: IconoNombre;
  titulo?: LocalizedString;
  subtitulo?: LocalizedString;
};

export type FeatureItem = {
  icono?: IconoNombre;
  titulo?: LocalizedString;
  descripcion?: LocalizedString;
};

export type Farmacia = {
  _id: string;
  nombre: string;
  slug: string;
  idiomasActivos?: IdiomaActivo[];
  logo?: string;
  imagenes?: ImagenConAlt[];
  imagenesSobre?: ImagenConAlt[];
  titular?: string;
  numeroColegiado?: string;
  descripcionCorta?: LocalizedText;
  descripcionLarga?: LocalizedPortableText;
  sobreNosotros?: SobreNosotros;
  faqs?: Faq[];
  direccion?: Direccion;
  mapaUrl?: string;
  contacto?: Contacto;
  horarios?: HorarioDia[];
  servicios?: Servicio[];
  redesSociales?: RedesSociales;
  seo?: SeoCampos;
  /** Slug de la CCAA cuyo calendario de vacunación destaca esta farmacia. */
  comunidadPredeterminadaSlug?: string;
  /** Resource name de Google Business Profile (accounts/X/locations/Y). */
  googleLocationName?: string;
  /** URL pública del negocio en Google Maps. */
  googleMapsUrl?: string;
  /** Chip pequeño arriba del título del Hero (fallback: "Farmacia en {ciudad}"). */
  heroChip?: LocalizedString;
  /** Línea destacada bajo el nombre en el Hero (fallback: "Farmacia en {ciudad}"). */
  heroSubtitulo?: LocalizedString;
  /** De 0 a 3 tarjetas flotando sobre la imagen del Hero. */
  heroTarjetasFlotantes?: TarjetaFlotante[];
  /** Lista de tarjetas de la sección Features (bajo el Hero). */
  featuresLista?: FeatureItem[];
  /** Textos editables de cabecera de las secciones. */
  textosServicios?: TextosCabecera;
  textosFaqs?: TextosCabecera;
  textosResenas?: TextosCabecera;
  avisoLegal?: LegalTexto;
  politicaPrivacidad?: LegalTexto;
};

const FARMACIA_PROJECTION = `
  _id,
  nombre,
  "slug": slug.current,
  "idiomasActivos": coalesce(idiomasActivos[]->{ _id, codigo, nombre }, []),
  "logo": logo.asset->url,
  "imagenes": coalesce(imagenes[]{ "url": asset->url, alt }, []),
  "imagenesSobre": coalesce(imagenesSobre[]{ "url": asset->url, alt }, []),
  titular,
  numeroColegiado,
  descripcionCorta,
  descripcionLarga,
  sobreNosotros,
  "faqs": coalesce(faqs, []),
  direccion,
  mapaUrl,
  contacto,
  "horarios": coalesce(horarios, []),
  "servicios": coalesce(servicios[]{ nombre, descripcion, icono, enlace }, []),
  redesSociales,
  seo {
    titulo,
    imagenOg { asset->{ url } }
  },
  "comunidadPredeterminadaSlug": comunidadPredeterminada->slug.current,
  googleLocationName,
  googleMapsUrl,
  heroChip,
  heroSubtitulo,
  "heroTarjetasFlotantes": coalesce(heroTarjetasFlotantes[]{ icono, titulo, subtitulo }, []),
  "featuresLista": coalesce(featuresLista[]{ icono, titulo, descripcion }, []),
  textosServicios,
  textosFaqs,
  textosResenas,
  avisoLegal,
  politicaPrivacidad
`;

export async function obtenerFarmaciaPorSlug(slug: string): Promise<Farmacia | null> {
  try {
    return await sanity.fetch(
      `*[_type == "farmacia" && slug.current == $slug][0] { ${FARMACIA_PROJECTION} }`,
      { slug },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[sanity] no se pudo cargar la farmacia "${slug}": ${msg}`);
    return null;
  }
}

export const SLUG_FARMACIA: string = requerirEnv(
  'PUBLIC_FARMACIA_SLUG',
  import.meta.env.PUBLIC_FARMACIA_SLUG,
);

export type ResenaGoogle = {
  _id: string;
  googleReviewId: string;
  autorNombre?: string;
  autorFotoUrl?: string;
  rating: number;
  comentario?: string;
  comentarioIdioma?: string;
  respuestaOwner?: string;
  respuestaOwnerFecha?: string;
  fechaPublicacion: string;
  destacada?: boolean;
};

export type ResumenResenas = {
  total: number;
  media: number;
  destacadas: ResenaGoogle[];
  recientes: ResenaGoogle[];
};

const RESENA_PROJECTION = `
  _id,
  googleReviewId,
  autorNombre,
  autorFotoUrl,
  rating,
  comentario,
  comentarioIdioma,
  respuestaOwner,
  respuestaOwnerFecha,
  fechaPublicacion,
  destacada
`;

/**
 * Trae las reseñas visibles de una farmacia (no ocultas, no eliminadas en Google),
 * más un resumen con el total y la nota media calculados sobre el mismo subset.
 *
 * `limite` controla cuántas reseñas RECIENTES se devuelven (las destacadas vienen aparte
 * y no cuentan contra ese límite). Por defecto 6.
 */
/** Lista TODAS las reseñas visibles de una farmacia, ordenadas por fecha desc. */
export async function listarResenasGoogle(farmaciaSlug: string): Promise<ResenaGoogle[]> {
  try {
    return await sanity.fetch<ResenaGoogle[]>(
      `*[_type == "resenaGoogle"
        && farmacia->slug.current == $slug
        && oculta != true
        && eliminadaEnGoogle != true]
        | order(fechaPublicacion desc) { ${RESENA_PROJECTION} }`,
      { slug: farmaciaSlug },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[sanity] no se pudieron listar reseñas de "${farmaciaSlug}": ${msg}`);
    return [];
  }
}

export async function obtenerResenasGoogle(
  farmaciaSlug: string,
  limite = 6,
): Promise<ResumenResenas> {
  try {
    const data = await sanity.fetch<{
      total: number;
      media: number;
      destacadas: ResenaGoogle[];
      recientes: ResenaGoogle[];
    }>(
      `{
        "total": count(*[_type == "resenaGoogle"
          && farmacia->slug.current == $slug
          && oculta != true
          && eliminadaEnGoogle != true]),
        "media": math::avg(*[_type == "resenaGoogle"
          && farmacia->slug.current == $slug
          && oculta != true
          && eliminadaEnGoogle != true].rating),
        "destacadas": *[_type == "resenaGoogle"
          && farmacia->slug.current == $slug
          && destacada == true
          && oculta != true
          && eliminadaEnGoogle != true]
          | order(fechaPublicacion desc) { ${RESENA_PROJECTION} },
        "recientes": *[_type == "resenaGoogle"
          && farmacia->slug.current == $slug
          && destacada != true
          && oculta != true
          && eliminadaEnGoogle != true]
          | order(fechaPublicacion desc)[0...$limite] { ${RESENA_PROJECTION} }
      }`,
      { slug: farmaciaSlug, limite },
    );
    return {
      total: data?.total ?? 0,
      media: typeof data?.media === 'number' ? data.media : 0,
      destacadas: data?.destacadas ?? [],
      recientes: data?.recientes ?? [],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[sanity] no se pudieron cargar reseñas de "${farmaciaSlug}": ${msg}`);
    return { total: 0, media: 0, destacadas: [], recientes: [] };
  }
}

type ImagenOpciones = { w?: number; h?: number; q?: number; fit?: 'crop' | 'max' };

export function imagenSanity(url: string | undefined, opts: ImagenOpciones = {}): string | undefined {
  if (!url) return undefined;
  const { w, h, q = 80, fit = 'max' } = opts;
  const params = new URLSearchParams({ auto: 'format', q: String(q), fit });
  if (w) params.set('w', String(w));
  if (h) params.set('h', String(h));
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${params.toString()}`;
}

function escaparHtml(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function bloqueInline(b: PortableBlock): string {
  const defs = b.markDefs ?? [];
  return (b.children ?? [])
    .map((span) => {
      let t = escaparHtml(span.text ?? '');
      const marks = span.marks ?? [];
      // Decoradores
      if (marks.includes('strong')) t = `<strong>${t}</strong>`;
      if (marks.includes('em')) t = `<em>${t}</em>`;
      if (marks.includes('underline')) t = `<u>${t}</u>`;
      // Anotaciones (enlaces): la mark es la _key del markDef
      const def = defs.find((d) => marks.includes(d._key));
      if (def && def._type === 'link' && def.href) {
        const href = escaparHtml(def.href);
        const attrs = def.externo
          ? ' target="_blank" rel="noopener noreferrer"'
          : '';
        t = `<a href="${href}"${attrs}>${t}</a>`;
      }
      return t;
    })
    .join('');
}

export function portableTextAHtml(bloques?: PortableBlock[]): string {
  if (!Array.isArray(bloques) || bloques.length === 0) return '';
  const salida: string[] = [];
  let listaAbierta: 'bullet' | 'number' | null = null;

  const cerrarLista = () => {
    if (listaAbierta) {
      salida.push(listaAbierta === 'number' ? '</ol>' : '</ul>');
      listaAbierta = null;
    }
  };

  for (const b of bloques) {
    if (b._type !== 'block') continue;
    const texto = bloqueInline(b);

    if (b.listItem === 'bullet' || b.listItem === 'number') {
      if (listaAbierta !== b.listItem) {
        cerrarLista();
        salida.push(b.listItem === 'number' ? '<ol>' : '<ul>');
        listaAbierta = b.listItem;
      }
      salida.push(`<li>${texto}</li>`);
      continue;
    }

    cerrarLista();
    const estilo = b.style ?? 'normal';
    if (estilo === 'h1') salida.push(`<h1>${texto}</h1>`);
    else if (estilo === 'h2') salida.push(`<h2>${texto}</h2>`);
    else if (estilo === 'h3') salida.push(`<h3>${texto}</h3>`);
    else if (estilo === 'h4') salida.push(`<h4>${texto}</h4>`);
    else if (estilo === 'blockquote') salida.push(`<blockquote>${texto}</blockquote>`);
    else salida.push(`<p>${texto}</p>`);
  }
  cerrarLista();
  return salida.join('');
}

const ORDEN_DIAS: DiaSemana[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const INDICE_DIAS: Record<DiaSemana, number> = {
  Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6,
};

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export type GrupoHorario = { etiqueta: string; horario: string };

function claveHorario(h: HorarioDia): string {
  if (h.cerrado) return 'cerrado';
  return `${h.apertura ?? ''}-${h.cierre ?? ''}`;
}

function formateaHorario(h: HorarioDia, etiquetaCerrado: string): string {
  if (h.cerrado) return etiquetaCerrado;
  if (h.apertura && h.cierre) return `${h.apertura} - ${h.cierre}`;
  return '—';
}

export type DiasI18n = Record<DiaSemana, string> & { a: string };

const DIAS_FALLBACK_ES: DiasI18n = {
  Mo: 'lunes', Tu: 'martes', We: 'miércoles', Th: 'jueves',
  Fr: 'viernes', Sa: 'sábado', Su: 'domingo',
  a: 'a',
};

export function agruparHorarios(
  horarios?: HorarioDia[],
  diasI18n: DiasI18n = DIAS_FALLBACK_ES,
  etiquetaCerrado = 'Cerrado',
): GrupoHorario[] {
  if (!horarios?.length) return [];
  const porDia = new Map<DiaSemana, HorarioDia>();
  horarios.forEach((h) => porDia.set(h.dia, h));

  const grupos: GrupoHorario[] = [];
  let inicioIdx: number | null = null;
  let claveActual: string | null = null;

  const cerrar = (finIdx: number) => {
    if (inicioIdx === null || claveActual === null) return;
    const diaInicio = diasI18n[ORDEN_DIAS[inicioIdx]];
    const diaFin = diasI18n[ORDEN_DIAS[finIdx]];
    const etiqueta =
      inicioIdx === finIdx
        ? capitalizar(diaInicio)
        : `${capitalizar(diaInicio)} - ${diaFin}`;
    const dato = porDia.get(ORDEN_DIAS[inicioIdx])!;
    grupos.push({ etiqueta, horario: formateaHorario(dato, etiquetaCerrado) });
  };

  ORDEN_DIAS.forEach((dia, idx) => {
    const dato = porDia.get(dia);
    if (!dato) {
      if (claveActual !== null) {
        cerrar(idx - 1);
        inicioIdx = null;
        claveActual = null;
      }
      return;
    }
    const clave = claveHorario(dato);
    if (claveActual === null) {
      inicioIdx = idx;
      claveActual = clave;
    } else if (clave !== claveActual) {
      cerrar(idx - 1);
      inicioIdx = idx;
      claveActual = clave;
    }
  });

  if (claveActual !== null && inicioIdx !== null) {
    cerrar(ORDEN_DIAS.length - 1);
  }

  return grupos;
}

export function rangoDiasAbiertos(
  horarios?: HorarioDia[],
  diasI18n: DiasI18n = DIAS_FALLBACK_ES,
): string | undefined {
  if (!horarios?.length) return undefined;
  const abiertos = new Set(
    horarios.filter((h) => !h.cerrado).map((h) => INDICE_DIAS[h.dia]),
  );
  if (abiertos.size === 0) return undefined;

  const indices = [...abiertos].sort((a, b) => a - b);
  const min = indices[0];
  const max = indices[indices.length - 1];

  let contiguo = true;
  for (let i = min; i <= max; i++) {
    if (!abiertos.has(i)) {
      contiguo = false;
      break;
    }
  }

  if (min === max) return capitalizar(diasI18n[ORDEN_DIAS[min]]);
  if (contiguo) {
    return `${capitalizar(diasI18n[ORDEN_DIAS[min]])} ${diasI18n.a} ${diasI18n[ORDEN_DIAS[max]]}`;
  }
  return indices.map((i) => capitalizar(diasI18n[ORDEN_DIAS[i]])).join(', ');
}
