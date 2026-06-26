/**
 * Dominio del feature `auth`.
 *
 * El modelo de usuario y roles vive en `shared/core/domain/models/Comparison`
 * (donde está el enum `Role` que también usa el resto de la app). Lo único
 * propio del feature son las extensiones de tipos de NextAuth — declaradas
 * vía augmentación global en `next-auth.d.ts`.
 *
 * Si en el futuro se añaden políticas (bloqueo tras N intentos, expiración
 * de contraseñas, etc.), las entidades/value-objects irían aquí.
 */
export {};
