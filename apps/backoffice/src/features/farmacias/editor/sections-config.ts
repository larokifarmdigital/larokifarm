// Metadata de las 9 secciones del editor. Sin Components (eso sigue en FarmaciaEditor
// para evitar que los tabs se importen aquí y el sidebar/picker/sheet acaben
// arrastrando todo el bundle de Tiptap y demás).

import type { IconName } from '@/features/shell/NavIcon';

export type SectionMeta = {
  key: string;
  label: string;
  icon: IconName;
  step: string;
  hint: string;
  multilang: boolean;
};

export const SECTION_META: SectionMeta[] = [
  { key: 'general', label: 'General', icon: 'Storefront', step: '01',
    hint: 'Identidad, contacto, dirección y horarios.', multilang: false },
  { key: 'hero', label: 'Hero', icon: 'Image', step: '02',
    hint: 'Primera pantalla: textos, imágenes y tarjetas flotantes.', multilang: true },
  { key: 'features', label: 'Features', icon: 'Lightning', step: '03',
    hint: 'Tarjetas bajo el hero. Hasta 6, se recomiendan 4.', multilang: true },
  { key: 'sobre', label: 'Sobre', icon: 'UsersThree', step: '04',
    hint: 'Historia, equipo, puntos destacados.', multilang: true },
  { key: 'servicios', label: 'Servicios', icon: 'Check', step: '05',
    hint: 'Servicios y sus descripciones por idioma.', multilang: true },
  { key: 'faqs', label: 'FAQs', icon: 'QuestionMark', step: '06',
    hint: 'Preguntas frecuentes. Aparecen como FAQ schema en Google.', multilang: true },
  { key: 'resenas', label: 'Reseñas', icon: 'ChatCircleText', step: '07',
    hint: 'Textos de la sección y conexión Google Business Profile.', multilang: true },
  { key: 'legal', label: 'Legal', icon: 'Scales', step: '08',
    hint: 'Aviso legal y política de privacidad.', multilang: true },
  { key: 'seo', label: 'SEO', icon: 'Globe', step: '09',
    hint: 'Cómo aparece la landing en resultados de búsqueda.', multilang: true },
];

export type GroupMeta = {
  key: string;
  label: string;
  sectionKeys: string[];
};

export const GROUPS: GroupMeta[] = [
  { key: 'datos', label: 'Datos', sectionKeys: ['general'] },
  { key: 'portada', label: 'Portada', sectionKeys: ['hero', 'features'] },
  { key: 'contenido', label: 'Contenido', sectionKeys: ['sobre', 'servicios', 'faqs', 'resenas'] },
  { key: 'config', label: 'Config', sectionKeys: ['legal', 'seo'] },
];

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

export const SECTION_INDEX: Record<string, number> = SECTION_META.reduce(
  (acc, s, i) => { acc[s.key] = i; return acc; },
  {} as Record<string, number>,
);
