import {
  listarResenasBackoffice,
  obtenerFarmaciaBackoffice,
  obtenerResenasBackoffice,
} from './backoffice';
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
} from '@larokifarm/contenido';

// Re-exportamos las utilidades compartidas para que el resto de la app las
// importe desde `@/lib/contenido` sin saber del package interno.
export {
  localizar,
  urlImagen,
  portableTextAHtml,
  agruparHorarios,
  rangoDiasAbiertos,
} from '@larokifarm/contenido';
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
  /** Solo backoffice: switch del editor. Sin valor → MOSTRAR_RESENAS_POR_DEFECTO. */
  mostrarResenas?: boolean;
  /** Solo backoffice: ajustes del chat de medicamentos (ver lib/chat.ts). */
  chat?: Partial<import('./ajustes').ChatWeb>;
  avisoLegal?: LegalTexto;
  politicaPrivacidad?: LegalTexto;
};


/** Farmacia de la web (API pública del backoffice: Neon + R2). */
export function obtenerFarmaciaPorSlug(slug: string): Promise<Farmacia | null> {
  return obtenerFarmaciaBackoffice(slug);
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

/** Idioma del comentario como atributo `lang` válido (WCAG 3.1.2), o undefined. */
export function langComentario(r: Pick<ResenaGoogle, 'comentarioIdioma'>): string | undefined {
  const l = r.comentarioIdioma?.trim();
  return l && /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(l) ? l : undefined;
}

export type ResumenResenas = {
  total: number;
  media: number;
  destacadas: ResenaGoogle[];
  recientes: ResenaGoogle[];
};

/** Lista TODAS las reseñas visibles de una farmacia, ordenadas por fecha desc. */
export function listarResenasGoogle(farmaciaSlug: string): Promise<ResenaGoogle[]> {
  return listarResenasBackoffice(farmaciaSlug);
}

/**
 * Trae un resumen de reseñas visibles de la farmacia (total, media, destacadas y `limite` recientes).
 *
 * `minRating` filtra TODO el resumen (total, media, destacadas y recientes) a las
 * reseñas con esa puntuación o superior. Útil para mostrar en la home solo 4-5★;
 * la página /resenas no debe pasar este parámetro para listar todas.
 *
 * `soloConComentario`: si true, excluye reseñas que solo tienen estrellas sin
 * texto. Útil para la home, donde un slot vacío con solo estrellas queda pobre.
 */
export function obtenerResenasGoogle(
  farmaciaSlug: string,
  limite = 6,
  minRating = 0,
  soloConComentario = false,
): Promise<ResumenResenas> {
  return obtenerResenasBackoffice(farmaciaSlug, limite, minRating, soloConComentario);
}
