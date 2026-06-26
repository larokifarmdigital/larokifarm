/**
 * Dominio del feature `admin`.
 *
 * Los modelos User/Business viven en `shared/core/domain` (cross-feature).
 * Aquí solo entran errores de dominio propios del admin (ForbiddenError,
 * ValidationError) y, en el futuro, value-objects de políticas (p.ej.
 * cuotas por negocio).
 */
export { ForbiddenError, ValidationError } from './errors';
