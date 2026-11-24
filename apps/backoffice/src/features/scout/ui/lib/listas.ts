import { ejecucionParada, type Ejecucion } from '@/core/precios/domain';
import { fechaFila } from '@/shared/lib/fechasMadrid';

/** Estado tal como lo ve el usuario ("interrumpida" = con error o proceso caído). */
export type EstadoVisible = 'en_cola' | 'comparando' | 'terminada' | 'interrumpida' | 'cancelada';

export function estadoVisible(e: Ejecucion): EstadoVisible {
  if (e.estado === 'con_error' || ejecucionParada(e)) return 'interrumpida';
  return e.estado as Exclude<EstadoVisible, 'interrumpida'>;
}

export const ESTADO_EJECUCION_LABEL: Record<EstadoVisible, string> = {
  en_cola: 'En cola',
  comparando: 'Comparando',
  terminada: 'Terminada',
  interrumpida: 'Interrumpida',
  cancelada: 'Cancelada',
};

export const ESTADO_EJECUCION_TONO: Record<EstadoVisible, 'neutral' | 'blue' | 'green' | 'yellow' | 'red'> = {
  en_cola: 'neutral',
  comparando: 'blue',
  terminada: 'green',
  interrumpida: 'yellow',
  cancelada: 'neutral',
};

export const activa = (e: Ejecucion | null) => !!e && (estadoVisible(e) === 'en_cola' || estadoVisible(e) === 'comparando');

/** Línea corta de la última comparación para la tabla de listas. */
export function lineaUltima(e: Ejecucion | null): string {
  if (!e) return 'Sin comparar';
  const v = estadoVisible(e);
  if (v === 'comparando') return `${e.hechos.toLocaleString('es-ES')} de ${e.total.toLocaleString('es-ES')}`;
  if (v === 'en_cola') return 'Esperando turno';
  return fechaFila(new Date(e.terminadaEn ?? e.creadaEn)).corta;
}

/** "2 h 10 min", "25 min". */
export function duracion(desde: string, hasta: string): string {
  const min = Math.max(1, Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}`;
}

export const numero = (n: number) => n.toLocaleString('es-ES');
