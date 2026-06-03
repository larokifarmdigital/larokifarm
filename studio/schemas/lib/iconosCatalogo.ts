/**
 * Catálogo de iconos disponibles para el selector visual en Sanity.
 *
 * Las paths SVG son las mismas que usa `apps/torrents/src/components/IconoServicio.astro`
 * en la web pública, así que lo que ves en el editor es exactamente lo que se renderiza.
 *
 * Si añades / quitas un icono aquí, recuerda actualizar también el componente
 * de la web y el type `IconoNombre` en `apps/torrents/src/lib/sanity.ts`.
 */

export type IconoNombre =
  | 'heart'
  | 'heart-pulse'
  | 'pill'
  | 'syringe'
  | 'stethoscope'
  | 'thermometer'
  | 'baby'
  | 'droplet'
  | 'sun'
  | 'shield'
  | 'sparkles'
  | 'leaf'
  | 'brain'
  | 'activity'
  | 'award'
  | 'users'
  | 'star'
  | 'clock';

export interface IconoCatalogo {
  value: IconoNombre;
  label: string;
  /** Contenido del `<svg>` (paths, círculos, polígonos). El wrapper lo añade el componente. */
  svg: string;
}

export const ICONOS_CATALOGO: IconoCatalogo[] = [
  {
    value: 'heart',
    label: 'Corazón (cuidado general)',
    svg: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  },
  {
    value: 'heart-pulse',
    label: 'Corazón pulso (cardio)',
    svg: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  },
  {
    value: 'pill',
    label: 'Pastilla (medicación)',
    svg: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  },
  {
    value: 'syringe',
    label: 'Jeringa (vacunación)',
    svg: '<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/>',
  },
  {
    value: 'stethoscope',
    label: 'Estetoscopio (consulta)',
    svg: '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  },
  {
    value: 'thermometer',
    label: 'Termómetro (síntomas / fiebre)',
    svg: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  },
  {
    value: 'baby',
    label: 'Bebé (cuidado infantil)',
    svg: '<path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/>',
  },
  {
    value: 'droplet',
    label: 'Gota (dermocosmética)',
    svg: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  },
  {
    value: 'sun',
    label: 'Sol (protección solar)',
    svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  },
  {
    value: 'shield',
    label: 'Escudo (protección)',
    svg: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  },
  {
    value: 'sparkles',
    label: 'Brillo (cosmética)',
    svg: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  },
  {
    value: 'leaf',
    label: 'Hoja (productos naturales)',
    svg: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96a1 1 0 0 1 1.8.4c0 1.8-.6 8.4-4 12.4-3.2 3.8-7 4.2-12 4.2"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
  },
  {
    value: 'brain',
    label: 'Cerebro (salud mental)',
    svg: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>',
  },
  {
    value: 'activity',
    label: 'Pulso (vitalidad)',
    svg: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.24 2.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4 12H2"/>',
  },
  {
    value: 'award',
    label: 'Premio (calidad)',
    svg: '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469L8.523 12.89"/><circle cx="12" cy="8" r="6"/>',
  },
  {
    value: 'users',
    label: 'Personas (familias / equipo)',
    svg: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  },
  {
    value: 'star',
    label: 'Estrella (favoritos)',
    svg: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  },
  {
    value: 'clock',
    label: 'Reloj (horario)',
    svg: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  },
];

export const ICONOS_VALORES = ICONOS_CATALOGO.map((i) => i.value);

export function buscarIcono(valor: string | undefined): IconoCatalogo | undefined {
  if (!valor) return undefined;
  return ICONOS_CATALOGO.find((i) => i.value === valor);
}
