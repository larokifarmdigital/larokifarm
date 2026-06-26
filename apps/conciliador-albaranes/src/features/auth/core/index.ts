/**
 * Barrel del `core/` de auth.
 *
 * Re-exporta el adapter (auth/signIn/signOut) y los use cases. Lo importan
 * el route handler (/api/auth/[...nextauth]), las server actions del feature
 * y el `middleware.ts` raíz (vía authConfig).
 */
export * from './domain';
export * from './application';
export * from './infrastructure';
