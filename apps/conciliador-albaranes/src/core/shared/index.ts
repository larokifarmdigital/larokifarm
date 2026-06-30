/**
 * API pública de `core/shared`: tipos cross-core (Role, Scope) + helpers.
 *
 * Otros módulos de `core/` lo importan libremente. Es el ÚNICO módulo de
 * core que puede ser consumido por todos los demás sin generar ciclo.
 */
export * from './domain';
