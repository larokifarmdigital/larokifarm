// Metadata de las secciones del editor. Sin Components (eso sigue en FarmaciaEditor
// para evitar que los tabs se importen aquí y el sidebar/picker/sheet acaben
// arrastrando todo el bundle de Tiptap y demás).
//
// Nombres en lenguaje llano (los mismos que usa Inicio). Las claves NO cambian
// (son el hash de la URL: #hero, #faqs, #seo… siguen funcionando); "horario"
// es nueva y es la sección de entrada.

import type { IconName } from '@/shared/components/atoms/NavIcon';

export type SectionMeta = {
  key: string;
  label: string;
  icon: IconName;
  hint: string;
  multilang: boolean;
  /** Solo la ve un SUPER_ADMIN (el servidor también lo comprueba). */
  soloAdmin?: boolean;
};

export const SECTION_META: SectionMeta[] = [
  { key: 'horario', label: 'Horario', icon: 'Clock',
    hint: 'Los días y las horas en que abre la farmacia.', multilang: false },
  { key: 'general', label: 'Contacto y dirección', icon: 'Storefront',
    hint: 'Nombre, teléfono, correo, redes sociales, dirección y logotipo.', multilang: false },
  { key: 'idiomas', label: 'Idiomas de la web', icon: 'Translate',
    hint: 'En qué idiomas se ve tu web y cuánto falta por traducir.', multilang: false },
  { key: 'hero', label: 'Portada', icon: 'Image',
    hint: 'Lo primero que se ve al entrar en tu web: textos, fotos y tarjetas.', multilang: true },
  { key: 'features', label: 'Puntos fuertes', icon: 'Lightning',
    hint: 'Tarjetas bajo la portada con lo que hace especial a tu farmacia. Hasta 6; mejor 4.', multilang: true },
  { key: 'sobre', label: 'Quiénes somos', icon: 'UsersThree',
    hint: 'La historia de la farmacia, el equipo y sus fotos.', multilang: true },
  { key: 'servicios', label: 'Servicios', icon: 'Check',
    hint: 'Lo que ofrece la farmacia, con una descripción de cada servicio.', multilang: true },
  { key: 'faqs', label: 'Preguntas frecuentes', icon: 'QuestionMark',
    hint: 'Respuestas a las dudas habituales. Google también puede mostrarlas.', multilang: true },
  { key: 'resenas', label: 'Reseñas', icon: 'ChatCircleText',
    hint: 'Qué opiniones de Google salen en tu web.', multilang: true },
  { key: 'legal', label: 'Textos legales', icon: 'Scales',
    hint: 'Aviso legal y política de privacidad.', multilang: true },
  { key: 'seo', label: 'Google y redes sociales', icon: 'Globe',
    hint: 'Cómo aparece tu web en Google y al compartirla por WhatsApp o redes.', multilang: true },
  { key: 'chat', label: 'Chat de medicamentos', icon: 'ChatCircleDots',
    hint: 'El chat de consulta de medicamentos (CIMA) de la web: si sale y cómo se ve.', multilang: false, soloAdmin: true },
];

export type GroupMeta = {
  key: string;
  label: string;
  sectionKeys: string[];
};

export const GROUPS: GroupMeta[] = [
  { key: 'farmacia', label: 'Tu farmacia', sectionKeys: ['horario', 'general', 'idiomas'] },
  { key: 'portada', label: 'Portada', sectionKeys: ['hero', 'features'] },
  { key: 'contenido', label: 'Contenido', sectionKeys: ['sobre', 'servicios', 'faqs', 'resenas'] },
  { key: 'avanzado', label: 'Avanzado', sectionKeys: ['legal', 'seo', 'chat'] },
];

/** Grupos con las secciones que puede ver este usuario. */
export function gruposVisibles(esAdmin: boolean): GroupMeta[] {
  return GROUPS.map((g) => ({
    ...g,
    sectionKeys: g.sectionKeys.filter((k) => esAdmin || !SECTION_BY_KEY[k]?.soloAdmin),
  })).filter((g) => g.sectionKeys.length > 0);
}

export function puedeVerSeccion(key: string, esAdmin: boolean): boolean {
  const s = SECTION_BY_KEY[key];
  return Boolean(s) && (esAdmin || !s.soloAdmin);
}

export const DEFAULT_SECTION_KEY = 'horario';

export const SECTION_BY_KEY: Record<string, SectionMeta> = SECTION_META.reduce(
  (acc, s) => { acc[s.key] = s; return acc; },
  {} as Record<string, SectionMeta>,
);

export const GROUP_OF_SECTION: Record<string, GroupMeta> = SECTION_META.reduce(
  (acc, s) => {
    acc[s.key] = GROUPS.find((g) => g.sectionKeys.includes(s.key)) ?? GROUPS[0];
    return acc;
  },
  {} as Record<string, GroupMeta>,
);
