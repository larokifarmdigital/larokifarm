/**
 * API pública del feature `auth`. Las pages, route handlers, middleware y
 * otros features importan SIEMPRE desde aquí.
 */

// Adapter (auth/signIn/signOut/handlers) y config para middleware
export { auth, handlers, signIn, signOut, authConfig } from './core/infrastructure';

// Use cases
export { LoginUseCase, LogoutUseCase, type LoginInput } from './core/application';

// Server actions (lo que invoca la UI)
export { loginAction, type LoginState } from './actions/login';
export { logoutAction } from './actions/logout';

// Vista de la página de login
export { LoginView } from './ui/views/LoginView';
