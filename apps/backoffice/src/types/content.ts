export type Locale = 'es' | 'en' | 'ca';

export const LOCALES: Locale[] = ['es', 'en', 'ca'];

export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Castellano',
  en: 'English',
  ca: 'Català',
};

export type MultilangText = Partial<Record<Locale, string>>;

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
  autor: string;
  puntuacion: number;
  texto: string;
  fecha: string;
  fuente: 'google' | 'manual';
  avatarUrl?: string;
};

/**
 * Datos estructurados de la sección "Sobre nosotros" en la landing.
 * Coincide con el objeto `sobreNosotros` del schema Sanity.
 */
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
  googleLocationName?: string;

  seo?: SeoConfig;

  createdAt: string;
  updatedAt: string;
  lastEditedBy?: string;
};

export type Usuario = {
  id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'manager' | 'viewer';
  farmaciaId?: string;
  createdAt: string;
};

export type FarmaciaSummary = Pick<
  Farmacia,
  'id' | 'slug' | 'nombre' | 'ciudad' | 'status' | 'idiomasActivos' | 'updatedAt' | 'logo'
>;

export type SaveResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
