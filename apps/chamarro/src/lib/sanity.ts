import { crearSanityClient } from '@larokifarm/sanity-client';
import type {
  EntradaI18n,
  LocalizedString,
  LocalizedText,
  LocalizedPortableText,
  PortableBlock,
  DiaSemana,
  HorarioDia,
  GrupoHorario,
  DiasI18n,
} from '@larokifarm/sanity-client';

export {
  localizar,
  imagenSanity,
  portableTextAHtml,
  agruparHorarios,
  rangoDiasAbiertos,
} from '@larokifarm/sanity-client';
export type {
  EntradaI18n,
  LocalizedString,
  LocalizedText,
  LocalizedPortableText,
  PortableBlock,
  DiaSemana,
  HorarioDia,
  GrupoHorario,
  DiasI18n,
};

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

export const sanity = crearSanityClient({ projectId, dataset });

export type IconoNombre =
  | 'heart' | 'heart-pulse' | 'pill' | 'syringe' | 'stethoscope'
  | 'thermometer' | 'baby' | 'droplet' | 'sun' | 'shield' | 'sparkles'
  | 'leaf' | 'brain' | 'activity' | 'award' | 'users' | 'star' | 'clock';

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
  comunidadPredeterminadaSlug?: string;
  googleLocationName?: string;
  googleMapsUrl?: string;
  heroChip?: LocalizedString;
  heroSubtitulo?: LocalizedString;
  heroTarjetasFlotantes?: TarjetaFlotante[];
  featuresLista?: FeatureItem[];
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
  "autorFotoUrl": autorFoto.asset->url,
  rating,
  comentario,
  comentarioIdioma,
  respuestaOwner,
  respuestaOwnerFecha,
  fechaPublicacion,
  destacada
`;

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
  minRating = 0,
  soloConComentario = false,
): Promise<ResumenResenas> {
  try {
    const filtroComentario = soloConComentario
      ? '&& defined(comentario) && comentario != ""'
      : '';
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
          && eliminadaEnGoogle != true
          && rating >= $minRating
          ${filtroComentario}]),
        "media": math::avg(*[_type == "resenaGoogle"
          && farmacia->slug.current == $slug
          && oculta != true
          && eliminadaEnGoogle != true
          && rating >= $minRating
          ${filtroComentario}].rating),
        "destacadas": *[_type == "resenaGoogle"
          && farmacia->slug.current == $slug
          && destacada == true
          && oculta != true
          && eliminadaEnGoogle != true
          && rating >= $minRating
          ${filtroComentario}]
          | order(fechaPublicacion desc) { ${RESENA_PROJECTION} },
        "recientes": *[_type == "resenaGoogle"
          && farmacia->slug.current == $slug
          && destacada != true
          && oculta != true
          && eliminadaEnGoogle != true
          && rating >= $minRating
          ${filtroComentario}]
          | order(fechaPublicacion desc)[0...$limite] { ${RESENA_PROJECTION} }
      }`,
      { slug: farmaciaSlug, limite, minRating },
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
