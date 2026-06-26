/**
 * Dominio del feature `historial`.
 *
 * El modelo principal (`Comparison`) vive en `shared/core/domain` porque
 * lo consumen varias features (historial lee, conciliador escribe, admin
 * agrega). Aquí solo entran tipos puramente de presentación del historial
 * (p.ej. parámetros normalizados de filtros) cuando empiecen a tener lógica.
 *
 * Vacío hoy — los `HistorialListParams` viven en la view porque son shape
 * de URL searchParams, no entidades de dominio. Si crecen (validación,
 * defaults, derivaciones) migrar aquí como `ListFiltersInput` value-object.
 */
export {};
