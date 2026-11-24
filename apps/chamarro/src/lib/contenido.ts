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
  /** Solo backoffice: switch del editor. Sin valor → MOSTRAR_RESENAS_POR_DEFECTO. */
  mostrarResenas?: boolean;
  /** Solo backoffice: ajustes del chat de medicamentos (ver lib/chat.ts). */
  chat?: Partial<import('./chat').ChatWeb>;
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

export function obtenerResenasGoogle(
  farmaciaSlug: string,
  limite = 6,
  minRating = 0,
  soloConComentario = false,
): Promise<ResumenResenas> {
  return obtenerResenasBackoffice(farmaciaSlug, limite, minRating, soloConComentario);
}
