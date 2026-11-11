'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/core/auth';
import { getFarmaciaRepository, type Farmacia } from '@/core/farmacias';
import type { SaveResult } from '@/core/shared';

export async function saveFarmaciaPatchAction(
  id: string,
  patch: Partial<Farmacia>,
): Promise<SaveResult<Farmacia>> {
  await requireUser();
  const res = await getFarmaciaRepository().saveFarmacia(id, patch);
  if (res.ok) {
    revalidatePath('/farmacias');
    revalidatePath(`/farmacias/${id}`);
  }
  return res;
}
