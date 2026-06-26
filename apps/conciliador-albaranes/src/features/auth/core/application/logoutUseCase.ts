/**
 * Use case: cerrar sesión.
 *
 * Hoy delega en Auth.js (`signOut` del adapter). Centralizar aquí el destino
 * tras logout permite cambiarlo (audit log, redirect dinámico) sin tocar la UI.
 */
import { signOut } from '../infrastructure';

export class LogoutUseCase {
  async execute(redirectTo: string = '/login'): Promise<void> {
    await signOut({ redirectTo });
  }
}
