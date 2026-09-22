'use server';

import { revalidatePath } from 'next/cache';
import { contentRepository } from '@/lib/content-repository';
import { requireUser } from '@/lib/session';
import type { Farmacia, SaveResult } from '@/types/content';

export async function saveFarmaciaPatchAction(
  id: string,
  patch: Partial<Farmacia>,
): Promise<SaveResult<Farmacia>> {
  await requireUser();
  const res = await contentRepository.saveFarmacia(id, patch);
  if (res.ok) {
    revalidatePath('/farmacias');
    revalidatePath(`/farmacias/${id}`);
  }
  return res;
}
