import type { Locale, MultilangText } from '@/core/shared';

export type FarmaciaStatus = 'draft' | 'published' | 'archived';

export type Direccion = {
  calle?: string;
  numero?: string;
  ciudad?: string;
  provincia?: string;
  cp?: string;
  pais?: string;
};

export type Horario = {
  dia: 'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom';
  tramos: { abre: string; cierra: string }[];
  cerrado?: boolean;
  nota?: MultilangText;
};

export type Redes = {
  instagram?: string;
  facebook?: string;
  x?: string;
  tiktok?: string;
  youtube?: string;
};

export type ImagenAsset = {
  id: string;
  url: string;
  alt: MultilangText;
  ancho?: number;
  alto?: number;
  peso?: number;
};

export type ServicioEnlace = {
  url?: string;
  nuevaPestana?: boolean;
};

export type Servicio = {
  id: string;
  icono?: string;
  nombre: MultilangText;
  descripcion?: MultilangText;
  enlace?: ServicioEnlace;
  orden: number;
};

export type Faq = {
  id: string;
  pregunta: MultilangText;
  respuesta: MultilangText;
  orden: number;
};

export type Resena = {
  id: string;
  googleReviewId?: string;
  autor: string;
  puntuacion: number;
  /** Vacío = reseña de solo estrellas. */
  texto?: string;
  textoIdioma?: string;
  respuesta?: string;
  respuestaFecha?: string;
  fecha: string;
  fuente: 'google' | 'manual';
  avatarUrl?: string;
  destacada: boolean;
  /** Ocultada por el editor: no sale en la landing. */
  oculta: boolean;
  eliminadaEnGoogle: boolean;
};

/**
 * Datos estructurados de la sección "Sobre nosotros" en la landing.
 * Coincide con el objeto `sobreNosotros` del schema Sanity.
 */
/**
 * Reglas de publicación de reseñas, cada una con su switch en el editor.
 * `minRating: null` = regla apagada (salen todas las estrellas).
 */
export type ResenasReglas = {
  minRating: number | null;
  soloConComentario: boolean;
};

/** Lo que tenía fijo la portada de las landings antes de ser configurable. */
export const RESENAS_REGLAS_POR_DEFECTO: ResenasReglas = { minRating: 4, soloConComentario: true };

/** ¿Esta reseña sale en la web? (no oculta, no borrada en Google y cumple las reglas). */
export function resenaEnWeb(r: Pick<Resena, 'oculta' | 'eliminadaEnGoogle' | 'puntuacion' | 'texto'>, reglas: ResenasReglas): boolean {
  if (r.oculta || r.eliminadaEnGoogle) return false;
  if (reglas.minRating != null && r.puntuacion < reglas.minRating) return false;
  if (reglas.soloConComentario && !(r.texto ?? '').trim()) return false;
  return true;
}

export type SobreNosotros = {
  /** Etiqueta pequeña sobre el título. Por defecto: "Sobre nosotros". */
  chip?: MultilangText;
  /** Título de la sección. Ej: "Una farmacia para familias". Las dos últimas palabras se resaltan. */
  titulo?: MultilangText;
  /** Badge "+X años". Convertido a número. */
  anyosExperiencia?: number;
  /**
   * Lista de 4-6 frases cortas destacadas. Cada punto tiene el mismo texto en cada idioma activo.
   * Máximo 8.
   */
  puntos?: MultilangText[];
};

/**
 * Tarjeta flotante sobre la imagen del Hero (0-3 por farmacia).
 * Coincide con `heroTarjetasFlotantes` del schema Sanity.
 */
export type HeroTarjetaFlotante = {
  id: string;
  icono?: string;
  titulo: MultilangText;
  subtitulo: MultilangText;
  orden: number;
};

/**
 * Tarjeta de la sección Features (hasta 6).
 * Si el icono es "reloj" y la descripción está vacía, la landing muestra el horario.
 * Coincide con `featuresLista` del schema Sanity.
 */
export type FeatureTarjeta = {
  id: string;
  icono?: string;
  titulo: MultilangText;
  descripcion?: MultilangText;
  orden: number;
};

export type SeoConfig = {
  title?: MultilangText;
  description?: MultilangText;
  ogImage?: ImagenAsset;
  robots?: string;
};

/**
 * Textos de cabecera i18n para las secciones Servicios/FAQs/Reseñas de la landing.
 * Coincide con el objeto textosServicios/textosFaqs/textosResenas del schema Sanity.
 * Si todos los campos están vacíos, la landing usa los textos por defecto.
 */
export type TextosCabecera = {
  chip?: MultilangText;
  titulo?: MultilangText;
  subtitulo?: MultilangText;
};

export type Farmacia = {
  id: string;
  slug: string;
  nombre: string;
  status: FarmaciaStatus;
  idiomasActivos: Locale[];

  ciudad?: string;
  telefono?: string;
  email?: string;
  whatsapp?: string;
  web?: string;

  titular?: string;
  numeroColegiado?: string;

  descripcionCorta: MultilangText;
  descripcionLarga: MultilangText;

  logo?: ImagenAsset;
  heroImages: ImagenAsset[];

  /** Etiqueta pequeña sobre el título del hero. */
  heroChip?: MultilangText;
  /** Subtítulo bajo el título del hero. */
  heroSubtitulo?: MultilangText;
  /** 0-3 tarjetas flotantes sobre la imagen del hero. */
  heroTarjetasFlotantes?: HeroTarjetaFlotante[];

  /** Franja de tarjetas bajo el hero (hasta 6). */
  featuresLista?: FeatureTarjeta[];

  /** Sección "Sobre nosotros" estructurada (chip, titulo, anyos, puntos). */
  sobreNosotros?: SobreNosotros;
  /** 1-6 imágenes para la sección "Sobre nosotros". */
  imagenesSobre?: ImagenAsset[];

  /**
   * Aviso legal en HTML (Tiptap → HTML), por idioma.
   * Si se deja vacío, la landing muestra el aviso legal por defecto del sitio.
   */
  avisoLegal?: MultilangText;
  /**
   * Política de privacidad en HTML (Tiptap → HTML), por idioma.
   * Si se deja vacío, la landing muestra la política por defecto del sitio.
   */
  politicaPrivacidad?: MultilangText;

  direccion?: Direccion;
  /** URL pública de la ficha en Google Maps. Botón «Cómo llegar» de la landing. */
  googleMapsUrl?: string;
  /**
   * URL del iframe embed de Google Maps (src del "Insertar un mapa").
   * Si está vacío, la landing cae al `googleMapsUrl` para el mapa.
   */
  mapaUrl?: string;
  horarios: Horario[];

  redes?: Redes;

  servicios: Servicio[];
  textosServicios?: TextosCabecera;

  faqs: Faq[];
  textosFaqs?: TextosCabecera;

  /**
   * Reseñas importadas desde Google Business Profile.
   * Read-only en el backoffice: se sincronizan vía Worker cuando la API está conectada.
   */
  resenas: Resena[];
  textosResenas?: TextosCabecera;
  /** Switch del editor: si es false la landing no muestra la sección Reseñas. */
  mostrarResenas: boolean;
  /** Qué reseñas salen en la web (además de las ocultas a mano). */
  resenasReglas: ResenasReglas;
  googleLocationName?: string;

  seo?: SeoConfig;

  createdAt: string;
  updatedAt: string;
  /** ISO de la última publicación (solo lectura). Con `updatedAt` posterior = cambios sin publicar. */
  ultimaPublicacion?: string;
  lastEditedBy?: string;
};

/** Usuario sin farmacia asignada que se puede poner de responsable al crear una. */
/** Usuario que se puede poner de responsable de una farmacia nueva; `farmacias` = las que ya lleva. */
export type ResponsableDisponible = { id: string; nombre: string; email: string; farmacias: string[] };

/**
 * Hay cambios guardados que aún no están en la web: nunca publicada, o
 * editada después de publicar (margen de 60 s: publicar también toca `updatedAt`).
 */
export function tieneCambiosSinPublicar(f: Pick<Farmacia, 'status' | 'updatedAt' | 'ultimaPublicacion'>): boolean {
  if (f.status !== 'published' || !f.ultimaPublicacion) return true;
  return new Date(f.updatedAt).getTime() - new Date(f.ultimaPublicacion).getTime() > 60_000;
}

export type FarmaciaSummary = Pick<
  Farmacia,
  'id' | 'slug' | 'nombre' | 'ciudad' | 'status' | 'idiomasActivos' | 'updatedAt' | 'logo' | 'web'
> & {
  /** ISO de la última publicación (para "cambios sin publicar" en Inicio). */
  ultimaPublicacion?: string;
};
