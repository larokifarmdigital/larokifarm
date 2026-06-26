/**
 * Adapter Auth.js v5 (cookie + JWT + Credentials provider).
 *
 * Es la única implementación de auth de la app. Si mañana se cambia (Clerk,
 * Lucia, etc.), aquí se reescribe sin tocar `application/` ni `actions/`.
 */
export { handlers, auth, signIn, signOut } from './authjs';
export { authConfig } from './authjs.config';
