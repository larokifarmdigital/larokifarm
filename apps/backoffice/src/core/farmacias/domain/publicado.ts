import type { Farmacia } from './models/Farmacia';

/**
 * Copia del contenido en el momento de publicar (columna `contenidoPublicado`).
 * La API pública sirve esta copia: reconstruir la web por otro motivo (un
 * despliegue de código) ya no publica cambios a medias. El editor la compara
 * con lo guardado para marcar qué falta por publicar.
 *
 * Fuera de la copia: identidad y fechas, y las reseñas, que se sincronizan de
 * Google y se muestran u ocultan al momento.
 */
const FUERA_DE_LA_COPIA = [
  'id',
  'slug',
  'status',
  'createdAt',
  'updatedAt',
  'ultimaPublicacion',
  'lastEditedBy',
  'resenas',
  'publicado',
  'googleLocationName',
] as const;

export type ContenidoPublicado = Omit<Farmacia, (typeof FUERA_DE_LA_COPIA)[number]>;

export function contenidoPublicable(f: Farmacia): ContenidoPublicado {
  const copia: Record<string, unknown> = { ...f };
  for (const k of FUERA_DE_LA_COPIA) delete copia[k];
  return JSON.parse(JSON.stringify(copia)) as ContenidoPublicado;
}

/** Lo que ve la web: la copia publicada sobre la ficha (sin copia, lo guardado, como antes). */
export function versionPublicada(f: Farmacia): Farmacia {
  if (!f.publicado) return f;
  return { ...f, ...f.publicado, resenas: f.resenas };
}

type CampoContenido = keyof ContenidoPublicado;

/** Sección del editor (sectionsConfig) y nombre legible de cada campo. */
const CAMPOS: Partial<Record<CampoContenido, { seccion: string; etiqueta: string }>> = {
  horarios: { seccion: 'horario', etiqueta: 'Horario semanal' },
  nombre: { seccion: 'general', etiqueta: 'Nombre de la farmacia' },
  titular: { seccion: 'general', etiqueta: 'Titular' },
  numeroColegiado: { seccion: 'general', etiqueta: 'Nº de colegiado' },
  logo: { seccion: 'general', etiqueta: 'Logo' },
  ciudad: { seccion: 'general', etiqueta: 'Ciudad' },
  telefono: { seccion: 'general', etiqueta: 'Teléfono' },
  whatsapp: { seccion: 'general', etiqueta: 'WhatsApp' },
  email: { seccion: 'general', etiqueta: 'Correo electrónico' },
  web: { seccion: 'general', etiqueta: 'Web' },
  redes: { seccion: 'general', etiqueta: 'Redes sociales' },
  direccion: { seccion: 'general', etiqueta: 'Dirección' },
  googleMapsUrl: { seccion: 'general', etiqueta: 'Enlace de Google Maps' },
  mapaUrl: { seccion: 'general', etiqueta: 'Mapa insertado' },
  idiomasActivos: { seccion: 'idiomas', etiqueta: 'Idiomas de la web' },
  heroChip: { seccion: 'hero', etiqueta: 'Etiqueta pequeña sobre el título' },
  heroSubtitulo: { seccion: 'hero', etiqueta: 'Frase principal' },
  descripcionCorta: { seccion: 'hero', etiqueta: 'Frase de apoyo' },
  heroImages: { seccion: 'hero', etiqueta: 'Fotos de la portada' },
  heroTarjetasFlotantes: { seccion: 'hero', etiqueta: 'Tarjetas sobre la foto' },
  featuresLista: { seccion: 'features', etiqueta: 'Puntos fuertes' },
  descripcionLarga: { seccion: 'sobre', etiqueta: 'Vuestra historia' },
  sobreNosotros: { seccion: 'sobre', etiqueta: 'Cabecera y puntos destacados' },
  imagenesSobre: { seccion: 'sobre', etiqueta: 'Fotos de «Quiénes somos»' },
  servicios: { seccion: 'servicios', etiqueta: 'Servicios' },
  textosServicios: { seccion: 'servicios', etiqueta: 'Cabecera de Servicios' },
  faqs: { seccion: 'faqs', etiqueta: 'Preguntas' },
  textosFaqs: { seccion: 'faqs', etiqueta: 'Cabecera de Preguntas frecuentes' },
  mostrarResenas: { seccion: 'resenas', etiqueta: 'Mostrar reseñas en la web' },
  resenasReglas: { seccion: 'resenas', etiqueta: 'Qué reseñas salen' },
  textosResenas: { seccion: 'resenas', etiqueta: 'Cabecera de Reseñas' },
  avisoLegal: { seccion: 'legal', etiqueta: 'Aviso legal' },
  politicaPrivacidad: { seccion: 'legal', etiqueta: 'Política de privacidad' },
  seo: { seccion: 'seo', etiqueta: 'Google y redes sociales' },
  chat: { seccion: 'chat', etiqueta: 'Chat de medicamentos' },
};

/** Fotos e idiomas tienen sus propias acciones (subir, activar…): no se deshacen con un patch. */
const NO_DESHACIBLES = new Set<CampoContenido>(['logo', 'heroImages', 'imagenesSobre', 'idiomasActivos']);

/**
 * Listas: se resume cuántos elementos son nuevos, cambiados o quitados. Se
 * comparan por contenido, sin `id`: el servidor recrea servicios, preguntas y
 * puntos fuertes con ids nuevos en cada guardado.
 */
const LISTAS = new Set<CampoContenido>(['servicios', 'faqs', 'featuresLista', 'heroTarjetasFlotantes', 'heroImages', 'imagenesSobre']);

export type CambioSinPublicar = {
  campo: CampoContenido;
  seccion: string;
  etiqueta: string;
  /** «2 nuevos · 1 cambiado» en las listas. */
  detalle?: string;
  /** Patch que devuelve el campo a lo publicado (null si no se puede, p. ej. fotos). */
  deshacer: Partial<Farmacia> | null;
};

/**
 * Vacío, '' , {} y [] valen lo mismo: escribir y borrar un texto no es un cambio.
 * Las claves se ordenan para comparar por contenido.
 */
function normalizar(v: unknown): unknown {
  if (v === null || v === undefined || v === '') return undefined;
  if (Array.isArray(v)) {
    const l = v.map(normalizar);
    return l.length ? l : undefined;
  }
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as object).sort()) {
      const n = normalizar((v as Record<string, unknown>)[k]);
      if (n !== undefined) out[k] = n;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return v;
}

const igual = (a: unknown, b: unknown) => JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`;
}

function sinIds(v: unknown): unknown {
  if (!Array.isArray(v)) return v;
  return v.map((x) => {
    if (!x || typeof x !== 'object') return x;
    const { id: _id, orden: _orden, ...resto } = x as Record<string, unknown>;
    void _id;
    void _orden;
    return resto;
  });
}

function detalleLista(antes: unknown, ahora: unknown): string | undefined {
  const firma = (x: unknown) => JSON.stringify(normalizar(x));
  const a = ((sinIds(antes) as unknown[]) ?? []).map(firma);
  const b = ((sinIds(ahora) as unknown[]) ?? []).map(firma);
  // Multiconjuntos: lo que sobra en cada lado. Un quitado + un nuevo = un cambiado.
  const resta = (x: string[], y: string[]) => {
    const quedan = [...y];
    return x.filter((s) => {
      const i = quedan.indexOf(s);
      if (i === -1) return true;
      quedan.splice(i, 1);
      return false;
    }).length;
  };
  const anadidos = resta(b, a);
  const borrados = resta(a, b);
  const cambiados = Math.min(anadidos, borrados);
  const nuevos = anadidos - cambiados;
  const quitados = borrados - cambiados;
  const orden = !anadidos && !borrados && a.join() !== b.join();
  const partes = [
    nuevos && plural(nuevos, 'nuevo', 'nuevos'),
    cambiados && plural(cambiados, 'cambiado', 'cambiados'),
    quitados && plural(quitados, 'quitado', 'quitados'),
    orden && 'nuevo orden',
  ].filter(Boolean);
  return partes.length ? partes.join(' · ') : undefined;
}

/**
 * Qué difiere entre lo guardado y lo publicado, campo a campo, en el orden de
 * las secciones del editor. `null` = la farmacia aún no tiene copia publicada
 * (se publicó antes de existir) y no se puede saber.
 */
export function cambiosSinPublicar(f: Farmacia): CambioSinPublicar[] | null {
  if (!f.publicado) return null;
  const ahora = contenidoPublicable(f) as Record<string, unknown>;
  const antes = f.publicado as Record<string, unknown>;
  const campos = new Set([...Object.keys(ahora), ...Object.keys(antes)]) as Set<CampoContenido>;
  const out: CambioSinPublicar[] = [];
  for (const campo of campos) {
    const lista = LISTAS.has(campo);
    if (lista ? igual(sinIds(antes[campo]), sinIds(ahora[campo])) : igual(antes[campo], ahora[campo])) continue;
    const meta = CAMPOS[campo] ?? { seccion: 'general', etiqueta: campo };
    out.push({
      campo,
      ...meta,
      detalle: lista ? detalleLista(antes[campo], ahora[campo]) : undefined,
      deshacer: NO_DESHACIBLES.has(campo) ? null : ({ [campo]: antes[campo] ?? null } as Partial<Farmacia>),
    });
  }
  const orden = Object.keys(CAMPOS);
  return out.sort((a, b) => {
    const ia = orden.indexOf(a.campo);
    const ib = orden.indexOf(b.campo);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}
