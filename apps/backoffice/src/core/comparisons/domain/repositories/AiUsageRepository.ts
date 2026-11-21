/** Uso de IA que no es una conciliación (hoy: sugerencias de traducción del editor). */
export interface AiUsageEntryInput {
  businessId: string;
  userId: string;
  action: string;
  costUsd: number;
  tokensIn: number;
  tokensOut: number;
}

/**
 * Registro en `usage_entries` (módulo TRADUCCION). Las lecturas no fallan
 * aunque la BD aún no tenga ese valor del enum (devuelven 0); `record` lanza
 * `ModuloIaNoMigradoError` en ese caso para que quien llama lo trate.
 */
export interface AiUsageRepository {
  record(entry: AiUsageEntryInput): Promise<void>;
  /** Coste USD acumulado del negocio desde `from`. */
  costSince(businessId: string, from: Date): Promise<number>;
  /** Nº de usos desde `from`, por usuario o por negocio. */
  countSince(filtro: { userId?: string; businessId?: string; from: Date }): Promise<number>;
}

/** La BD todavía no tiene `'TRADUCCION'` en el enum `UsageModule` (falta la migración). */
export class ModuloIaNoMigradoError extends Error {
  constructor() {
    super('Falta ejecutar la migración TRADUCCION del enum UsageModule');
    this.name = 'ModuloIaNoMigradoError';
  }
}
