import type { DocTipo } from '../api/types';

export type DocMode = 'patient' | 'pro';

export interface ChipDef {
  id: string;
  label: string;
  tipo: DocTipo;
  seccion: string;
  fallback?: { tipo: DocTipo; seccion: string };
}

export const CHIPS_PRO: ChipDef[] = [
  { id: 'indicaciones', label: '¿Para qué sirve?', tipo: 1, seccion: '4.1' },
  { id: 'posologia', label: 'Dosis y administración', tipo: 1, seccion: '4.2' },
  { id: 'contraindicaciones', label: 'Cuándo NO tomarlo', tipo: 1, seccion: '4.3' },
  { id: 'advertencias', label: 'Advertencias', tipo: 1, seccion: '4.4' },
  { id: 'interacciones', label: 'Interacciones', tipo: 1, seccion: '4.5' },
  { id: 'embarazo', label: 'Embarazo y lactancia', tipo: 1, seccion: '4.6' },
  { id: 'conduccion', label: 'Conducción', tipo: 1, seccion: '4.7' },
  { id: 'adversos', label: 'Efectos adversos', tipo: 1, seccion: '4.8' },
];

export const CHIPS_PATIENT: ChipDef[] = [
  { id: 'p-que-es', label: '¿Para qué sirve?', tipo: 2, seccion: '1', fallback: { tipo: 1, seccion: '4.1' } },
  { id: 'p-antes', label: 'Antes de tomarlo', tipo: 2, seccion: '2', fallback: { tipo: 1, seccion: '4.3' } },
  { id: 'p-como', label: 'Cómo tomarlo', tipo: 2, seccion: '3', fallback: { tipo: 1, seccion: '4.2' } },
  { id: 'p-adversos', label: 'Efectos adversos', tipo: 2, seccion: '4', fallback: { tipo: 1, seccion: '4.8' } },
  { id: 'p-conservacion', label: 'Conservación', tipo: 2, seccion: '5' },
];

export function chipsFor(mode: DocMode): ChipDef[] {
  return mode === 'patient' ? CHIPS_PATIENT : CHIPS_PRO;
}
