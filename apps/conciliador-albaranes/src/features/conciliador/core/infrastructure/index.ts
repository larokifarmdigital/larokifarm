/**
 * Infraestructura del feature `conciliador`.
 *
 * Sin adapters propios — el conciliador es un orquestador puro: consume
 * `getComparisonRepository()` + `getStorage()` de `shared/core` para
 * persistir/subir, y el motor (`core/domain`) llama directamente a Gemini
 * (única dependencia externa, documentada en `extraerAlbaran.ts`).
 *
 * Si se añade un cliente dedicado (cola de jobs, queue, etc.), va aquí.
 */
export {};
