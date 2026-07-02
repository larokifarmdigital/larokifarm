import { signOut } from '../infrastructure';

export class LogoutUseCase {
  async execute(redirectTo: string = '/login'): Promise<void> {
    await signOut({ redirectTo });
  }
}
