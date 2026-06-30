/**
 * Use case: iniciar sesión con email + password.
 *
 * Hoy delega en Auth.js (`signIn` del adapter). Si en el futuro se añade
 * MFA o políticas de bloqueo, esta clase es donde viven (sin tocar la UI ni
 * el provider).
 */
import { signIn } from '../infrastructure';

export interface LoginInput {
  email: string;
  password: string;
  redirectTo?: string;
}

export class LoginUseCase {
  async execute(input: LoginInput): Promise<void> {
    await signIn('credentials', {
      email: input.email,
      password: input.password,
      redirectTo: input.redirectTo ?? '/',
    });
  }
}
