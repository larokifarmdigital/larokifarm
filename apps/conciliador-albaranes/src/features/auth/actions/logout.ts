'use server';

import { LogoutUseCase } from '@/core/auth';

const useCase = new LogoutUseCase();

export async function logoutAction() {
  await useCase.execute();
}
