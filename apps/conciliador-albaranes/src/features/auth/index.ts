/**
 * API pública del feature `auth` (UI + actions).
 *
 * La lógica (Auth.js, use cases) vive en `core/auth`. Este feature solo
 * exporta lo que las pages necesitan: el form de login y las actions.
 */
export { loginAction, type LoginState } from './actions/login';
export { logoutAction } from './actions/logout';
export { LoginView } from './ui/views/LoginView';
