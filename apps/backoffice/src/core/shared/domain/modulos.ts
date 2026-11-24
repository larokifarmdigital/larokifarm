import type { AppModule } from '@prisma/client';

/** Módulos del backoffice que se activan por usuario en Ajustes → Usuarios. */
export type Modulo = 'conciliador' | 'comparador';

export const MODULOS: readonly Modulo[] = ['conciliador', 'comparador'];

export const MODULO_LABEL: Record<Modulo, string> = {
  conciliador: 'Conciliador de albaranes',
  comparador: 'Comparador de precios',
};

export function esModulo(v: unknown): v is Modulo {
  return typeof v === 'string' && (MODULOS as readonly string[]).includes(v);
}

/**
 * ÚNICO punto para decidir si alguien puede usar un módulo. El administrador
 * los tiene todos, sin casillas (decisión de gestión 24-11-2026).
 */
export function tieneModulo(u: { esAdmin: boolean; modulos: readonly Modulo[] }, m: Modulo): boolean {
  return u.esAdmin || u.modulos.includes(m);
}

/** Valores de la BD (enum `AppModule`) → dominio. Ignora valores desconocidos. */
export function modulosDeDb(ms: readonly string[] | null | undefined): Modulo[] {
  return (ms ?? []).map((m) => m.toLowerCase()).filter(esModulo);
}

export function modulosADb(ms: readonly Modulo[]): AppModule[] {
  return [...new Set(ms)].map((m) => m.toUpperCase() as AppModule);
}
