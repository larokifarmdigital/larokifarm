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
