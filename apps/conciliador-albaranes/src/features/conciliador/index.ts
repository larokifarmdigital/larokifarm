/**
 * API pública del feature `conciliador`.
 *
 * - `core/` agrupa dominio (motor puro), aplicación (use cases) y contratos HTTP.
 * - `ui/` agrupa componentes, views y helpers de presentación.
 *
 * Lo interno (carpetas privadas, tests) NO se reexporta — se importa por ruta
 * relativa dentro del feature.
 */
export * from './core';
export { ConciliadorView } from './ui/views/ConciliadorView';
