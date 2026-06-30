/**
 * API pública de `core/auth`.
 *
 * Dependencias cross-core: `core/usuarios` (verificación de credenciales).
 */
export { auth, handlers, signIn, signOut, authConfig } from './infrastructure';
export { LoginUseCase, LogoutUseCase, type LoginInput } from './application';
