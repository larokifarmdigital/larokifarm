'use server';

import { revalidatePath } from 'next/cache';
import { SetResenaVisibleUseCase, getResenaRepository } from '@/core/farmacias';

/** Switch por reseña: visible en la web o no. */
export async function setResenaVisibleAction(
  businessId: string,
  resenaId: string,
  visible: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await new SetResenaVisibleUseCase(getResenaRepository()).execute(businessId, resenaId, visible);
  if (res.ok) revalidatePath(`/farmacias/${businessId}`);
  return res;
}
