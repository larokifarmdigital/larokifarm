/**
 * Adapter Auth.js v5 (cookie + JWT + Credentials provider).
 *
 * Dependencia cross-core: `core/usuarios` (para verificar credenciales).
 * Si se cambia el provider (Clerk, Lucia, etc.), aquí se reescribe.
 */
export { handlers, auth, signIn, signOut } from './authjs';
export { authConfig } from './authjs.config';
