/**
 * Reglas de validación de la ficha de una farmacia — FUENTE ÚNICA.
 *
 * Las usan:
 *   - el editor (error en rojo bajo cada campo, al salir de él)
 *   - el botón Publicar (lista de errores que bloquea)
 *   - el servidor al publicar (PublishFarmaciaUseCase), para que no se pueda
 *     publicar con datos inválidos aunque se salte la UI
 *
 * El autoguardado NO bloquea por formato: un borrador a medias se guarda
 * siempre (no se pierde nada). Lo que se exige es para PUBLICAR.
 *
 * Puro y sin dependencias de servidor: se importa también desde el cliente.
 */

import type { Locale } from '@/core/shared';
import type { Farmacia, Horario, Redes } from './models/Farmacia';

export type FieldIssue = {
  /** Clave estable del campo (p. ej. `email`, `direccion.cp`, `redes.instagram`). */
  field: string;
  /** Sección del editor donde se corrige (sectionsConfig). */
  sectionKey: string;
  /** Nombre del campo tal como lo ve el usuario. */
  label: string;
  message: string;
  /** id del input en el DOM, para llevar el foco al pulsar "Revisar". */
  inputId?: string;
  /** Para campos multidioma: el idioma que falla. */
  locale?: Locale;
  kind: 'required' | 'format';
};

// ───────────────────────────────────────────────────────────────────
// Reglas de formato (devuelven el mensaje de error o null)
// ───────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const trimmed = (v?: string | null) => (v ?? '').trim();

export function httpUrl(v: string): URL | null {
  try {
    const u = new URL(v.trim());
    return (u.protocol === 'https:' || u.protocol === 'http:') && u.hostname.includes('.') ? u : null;
  } catch {
    return null;
  }
}

const isGoogleHost = (host: string) => /(^|\.)google\.[a-z.]+$/i.test(host) || /(^|\.)goo\.gl$/i.test(host);

export const rules = {
  email: (v: string) => (EMAIL_RE.test(v.trim()) ? null : 'Escribe un correo válido (ej. hola@farmacia.com).'),

  phone: (v: string) => {
    if (!/^[+\d\s().-]+$/.test(v.trim())) return 'Solo números, espacios, guiones y el prefijo +.';
    const digits = v.replace(/\D/g, '').length;
    return digits >= 9 && digits <= 15 ? null : 'Debe tener entre 9 y 15 dígitos (ej. +34 934 12 34 56).';
  },

  url: (v: string) => (httpUrl(v) ? null : 'Escribe la dirección completa, empezando por https:// (ej. https://mifarmacia.com).'),

  googleMapsLink: (v: string) => {
    const u = httpUrl(v);
    return u && isGoogleHost(u.hostname)
      ? null
      : 'Pega el enlace de Google Maps (maps.google.com o maps.app.goo.gl → «Compartir» → «Copiar enlace»).';
  },

  mapaEmbed: (v: string) => {
    const u = httpUrl(v);
    return u && isGoogleHost(u.hostname) && u.pathname.includes('/maps')
      ? null
      : 'Pega el src del iframe de Google Maps (empieza por https://www.google.com/maps/embed…).';
  },

  cp: (v: string, pais?: string) => {
    const spain = !trimmed(pais) || /espa|spain/i.test(pais ?? '');
    if (spain) return /^(0[1-9]|[1-4]\d|5[0-2])\d{3}$/.test(v.trim()) ? null : 'Código postal de 5 cifras (ej. 08013).';
    return /^[A-Za-z0-9 -]{3,10}$/.test(v.trim()) ? null : 'Código postal no válido.';
  },

  colegiado: (v: string) => (/^[A-Za-z0-9./ -]{1,20}$/.test(v.trim()) ? null : 'Solo números, letras y guiones (máx 20).'),

  googleLocationName: (v: string) =>
    /^(accounts\/\d+\/)?locations\/\d+$/.test(v.trim()) ? null : 'Formato accounts/<id>/locations/<id>.',

  anyosExperiencia: (v: number) =>
    Number.isInteger(v) && v >= 0 && v <= 150 ? null : 'Un número entero entre 0 y 150.',
};

// ───────────────────────────────────────────────────────────────────
// Redes sociales: se acepta usuario (@farmacia) o URL de esa red
// ───────────────────────────────────────────────────────────────────

const SOCIAL: Record<keyof Redes, { label: string; hosts: RegExp; base: string }> = {
  instagram: { label: 'Instagram', hosts: /(^|\.)instagram\.com$/i, base: 'https://www.instagram.com/' },
  facebook: { label: 'Facebook', hosts: /(^|\.)(facebook|fb)\.com$/i, base: 'https://www.facebook.com/' },
  x: { label: 'X (Twitter)', hosts: /(^|\.)(x|twitter)\.com$/i, base: 'https://x.com/' },
  tiktok: { label: 'TikTok', hosts: /(^|\.)tiktok\.com$/i, base: 'https://www.tiktok.com/@' },
  youtube: { label: 'YouTube', hosts: /(^|\.)(youtube\.com|youtu\.be)$/i, base: 'https://www.youtube.com/@' },
};
const USERNAME_RE = /^@?[A-Za-z0-9._-]{1,60}$/;

export function socialIssue(network: keyof Redes, v: string): string | null {
  const value = v.trim();
  if (USERNAME_RE.test(value)) return null;
  const u = httpUrl(value);
  if (u && SOCIAL[network].hosts.test(u.hostname)) return null;
  return `Escribe tu usuario (ej. @mifarmacia) o el enlace de tu perfil de ${SOCIAL[network].label}.`;
}

/** Usuario → URL completa del perfil (las landings lo usan en `href`). */
export function socialUrl(network: keyof Redes, v?: string): string | undefined {
  const value = trimmed(v);
  if (!value || socialIssue(network, value)) return undefined;
  if (httpUrl(value)) return value;
  return SOCIAL[network].base + value.replace(/^@/, '');
}

// ───────────────────────────────────────────────────────────────────
// Horario
// ───────────────────────────────────────────────────────────────────

const toMin = (t: string) => {
  const [h, m] = t.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
};

/** Error de un tramo (bloquea publicar). Cierre < apertura NO es error: puede cruzar la medianoche. */
export function tramoError(t: { abre: string; cierra: string }, prev?: { abre: string; cierra: string }): string | null {
  if (!TIME_RE.test(t.abre) || !TIME_RE.test(t.cierra)) return 'Falta la hora de apertura o de cierre.';
  if (t.abre === t.cierra) return 'La hora de cierre es igual a la de apertura.';
  if (prev && TIME_RE.test(prev.cierra) && toMin(t.abre) < toMin(prev.cierra) && toMin(prev.cierra) > toMin(prev.abre)) {
    return 'Se solapa con el tramo anterior.';
  }
  return null;
}

const DIA_LABEL: Record<Horario['dia'], string> = {
  lun: 'lunes', mar: 'martes', mie: 'miércoles', jue: 'jueves', vie: 'viernes', sab: 'sábado', dom: 'domingo',
};

// ───────────────────────────────────────────────────────────────────
// Validación completa
// ───────────────────────────────────────────────────────────────────

/** id del DOM de un campo validado (los componentes de campo lo usan con la prop `field`). */
export function fieldDomId(field: string): string {
  return 'campo-' + field.replace(/[^a-zA-Z0-9]+/g, '-');
}

const textEs = (t?: Partial<Record<Locale, string>> | null) => trimmed(t?.es).length > 0;
const htmlEs = (t?: Partial<Record<Locale, string>> | null) =>
  trimmed((t?.es ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ')).length > 0;

/**
 * Todos los problemas que impiden publicar. Lista vacía = se puede publicar.
 * Los textos multidioma se exigen en castellano (idioma principal y fallback
 * de la web); el resto de idiomas los avisa el chequeo de traducciones.
 */
export function validateFarmacia(f: Farmacia): FieldIssue[] {
  const out: FieldIssue[] = [];
  const REQUIRED = 'Obligatorio para publicar.';
  const req = (field: string, sectionKey: string, label: string, ok: boolean, inputId = fieldDomId(field), message = REQUIRED, locale?: Locale) => {
    if (!ok) out.push({ field, sectionKey, label, inputId, locale, kind: 'required', message });
  };
  const reqEs = (field: string, sectionKey: string, label: string, ok: boolean) =>
    req(field, sectionKey, label, ok, fieldDomId(field), 'Obligatorio en castellano para publicar.', 'es');
  const fmt = (field: string, sectionKey: string, label: string, value: string | undefined | null, rule: (v: string) => string | null, inputId?: string) => {
    if (!trimmed(value)) return;
    const message = rule(value!);
    if (message) out.push({ field, sectionKey, label, inputId, kind: 'format', message });
  };
  const d = f.direccion ?? {};

  // ── General · identidad
  req('nombre', 'general', 'Nombre comercial', trimmed(f.nombre).length > 0, 'nombre');
  req('slug', 'general', 'URL pública', trimmed(f.slug).length > 0, 'slug');
  req('logo', 'general', 'Logotipo', Boolean(f.logo?.url), fieldDomId('logo'), 'Sube el logotipo para publicar.');
  fmt('numeroColegiado', 'general', 'Nº colegiado', f.numeroColegiado, rules.colegiado, 'colegiado');

  // ── General · contacto
  req('telefono', 'general', 'Teléfono', trimmed(f.telefono).length > 0, 'telefono');
  fmt('telefono', 'general', 'Teléfono', f.telefono, rules.phone, 'telefono');
  fmt('whatsapp', 'general', 'WhatsApp', f.whatsapp, rules.phone, 'whatsapp');
  req('email', 'general', 'Correo electrónico', trimmed(f.email).length > 0, 'email');
  fmt('email', 'general', 'Correo electrónico', f.email, rules.email, 'email');
  req('web', 'general', 'Dirección de tu web', trimmed(f.web).length > 0, 'web');
  fmt('web', 'general', 'Dirección de tu web', f.web, rules.url, 'web');

  // ── General · redes (opcionales)
  for (const network of Object.keys(SOCIAL) as (keyof Redes)[]) {
    fmt(`redes.${network}`, 'general', SOCIAL[network].label, f.redes?.[network], (v) => socialIssue(network, v), `red-${network}`);
  }

  // ── General · dirección (todos los campos) + mapa
  req('direccion.calle', 'general', 'Calle', trimmed(d.calle).length > 0, 'calle');
  req('direccion.cp', 'general', 'Código postal', trimmed(d.cp).length > 0, 'cp');
  fmt('direccion.cp', 'general', 'Código postal', d.cp, (v) => rules.cp(v, d.pais), 'cp');
  req('direccion.ciudad', 'general', 'Ciudad (dirección)', trimmed(d.ciudad ?? f.ciudad).length > 0, 'ciudad-dir');
  req('direccion.provincia', 'general', 'Provincia', trimmed(d.provincia).length > 0, 'provincia');
  req('direccion.pais', 'general', 'País', trimmed(d.pais).length > 0, 'pais');
  req('mapa', 'general', 'Enlace de Google Maps', trimmed(f.googleMapsUrl).length > 0 || trimmed(f.mapaUrl).length > 0, 'gmaps',
    'Pega el enlace de tu farmacia en Google Maps: lo usan el mapa y el botón «Cómo llegar».');
  fmt('googleMapsUrl', 'general', 'Enlace de Google Maps', f.googleMapsUrl, rules.googleMapsLink, 'gmaps');
  fmt('mapaUrl', 'general', 'Mapa insertado', f.mapaUrl, rules.mapaEmbed, 'mapa-embed');

  // ── General · horario
  const abiertos = f.horarios.filter((h) => !h.cerrado && h.tramos.length > 0);
  req('horarios', 'horario', 'Horario', abiertos.length > 0, 'sec-horarios', 'Abre al menos un día para poder publicar.');
  for (const h of f.horarios) {
    if (h.cerrado) continue;
    h.tramos.forEach((t, i) => {
      const message = tramoError(t, h.tramos[i - 1]);
      if (message) {
        out.push({ field: `horarios.${h.dia}.${i}`, sectionKey: 'horario', label: `Horario del ${DIA_LABEL[h.dia]}`, inputId: 'sec-horarios', kind: 'format', message });
      }
    });
  }

  // ── Hero (todo)
  reqEs('heroChip.es', 'hero', 'Chip del hero', textEs(f.heroChip));
  reqEs('heroSubtitulo.es', 'hero', 'Subtítulo del hero', textEs(f.heroSubtitulo));
  reqEs('descripcionCorta.es', 'hero', 'Claim / descripción corta', textEs(f.descripcionCorta));
  req('heroImages', 'hero', 'Imágenes del hero', f.heroImages.length > 0, fieldDomId('heroImages'), 'Sube al menos 1 imagen.');
  req('heroTarjetasFlotantes', 'hero', 'Tarjetas flotantes', (f.heroTarjetasFlotantes ?? []).length > 0, fieldDomId('heroTarjetasFlotantes'), 'Añade al menos 1 tarjeta.');

  // ── Features
  req('featuresLista', 'features', 'Features', (f.featuresLista ?? []).length > 0, fieldDomId('featuresLista'), 'Añade al menos 1 feature.');

  // ── Sobre (todo salvo años de experiencia y puntos destacados)
  reqEs('sobreNosotros.chip.es', 'sobre', 'Chip de «Sobre nosotros»', textEs(f.sobreNosotros?.chip));
  reqEs('sobreNosotros.titulo.es', 'sobre', 'Título de «Sobre nosotros»', textEs(f.sobreNosotros?.titulo));
  reqEs('descripcionLarga.es', 'sobre', 'Descripción larga', htmlEs(f.descripcionLarga));
  req('imagenesSobre', 'sobre', 'Imágenes de «Sobre nosotros»', (f.imagenesSobre ?? []).length > 0, fieldDomId('imagenesSobre'), 'Sube al menos 1 imagen.');
  if (f.sobreNosotros?.anyosExperiencia != null) {
    const message = rules.anyosExperiencia(f.sobreNosotros.anyosExperiencia);
    if (message) out.push({ field: 'sobreNosotros.anyosExperiencia', sectionKey: 'sobre', label: 'Años de experiencia', inputId: 'anyos-experiencia', kind: 'format', message });
  }

  // ── Servicios: cabecera + al menos 1, cada uno con nombre y descripción
  reqEs('textosServicios.chip.es', 'servicios', 'Chip de Servicios', textEs(f.textosServicios?.chip));
  reqEs('textosServicios.titulo.es', 'servicios', 'Título de Servicios', textEs(f.textosServicios?.titulo));
  reqEs('textosServicios.subtitulo.es', 'servicios', 'Subtítulo de Servicios', textEs(f.textosServicios?.subtitulo));
  req('servicios', 'servicios', 'Servicios', f.servicios.length > 0, fieldDomId('servicios'), 'Añade al menos 1 servicio.');
  f.servicios.forEach((sv, i) => {
    if (!textEs(sv.nombre) || !textEs(sv.descripcion)) {
      out.push({ field: `servicios.${sv.id}`, sectionKey: 'servicios', label: `Servicio ${i + 1}${sv.nombre?.es ? ` «${sv.nombre.es}»` : ''}`, inputId: fieldDomId('servicios'), locale: 'es', kind: 'required', message: 'Necesita nombre y descripción en castellano.' });
    }
  });

  // ── FAQs: cabecera + al menos 1, cada una con pregunta y respuesta
  reqEs('textosFaqs.chip.es', 'faqs', 'Chip de FAQs', textEs(f.textosFaqs?.chip));
  reqEs('textosFaqs.titulo.es', 'faqs', 'Título de FAQs', textEs(f.textosFaqs?.titulo));
  reqEs('textosFaqs.subtitulo.es', 'faqs', 'Subtítulo de FAQs', textEs(f.textosFaqs?.subtitulo));
  req('faqs', 'faqs', 'Preguntas frecuentes', f.faqs.length > 0, fieldDomId('faqs'), 'Añade al menos 1 pregunta.');
  f.faqs.forEach((q, i) => {
    if (!textEs(q.pregunta) || !textEs(q.respuesta)) {
      out.push({ field: `faqs.${q.id}`, sectionKey: 'faqs', label: `Pregunta ${i + 1}${q.pregunta?.es ? ` «${q.pregunta.es}»` : ''}`, inputId: fieldDomId('faqs'), locale: 'es', kind: 'required', message: 'Necesita pregunta y respuesta en castellano.' });
    }
  });

  // ── Legal
  reqEs('avisoLegal.es', 'legal', 'Aviso legal', htmlEs(f.avisoLegal));
  reqEs('politicaPrivacidad.es', 'legal', 'Política de privacidad', htmlEs(f.politicaPrivacidad));

  // ── Reseñas (opcional: switch «Mostrar reseñas»)
  fmt('googleLocationName', 'resenas', 'Google Business Profile', f.googleLocationName, rules.googleLocationName, 'google-location');

  // ── SEO (todo)
  reqEs('seo.title.es', 'seo', 'Título SEO', textEs(f.seo?.title));
  reqEs('seo.description.es', 'seo', 'Descripción SEO', textEs(f.seo?.description));
  req('seo.ogImage', 'seo', 'Imagen para redes sociales (OG)', Boolean(f.seo?.ogImage?.url), fieldDomId('seo.ogImage'), 'Sube la imagen que se ve al compartir la web.');

  return out;
}

/** Resumen corto para mensajes de error del servidor. */
export function describeIssues(issues: FieldIssue[]): string {
  const names = [...new Set(issues.map((i) => i.label))];
  const head = names.slice(0, 3).join(', ');
  return names.length > 3 ? `${head} y ${names.length - 3} más` : head;
}
