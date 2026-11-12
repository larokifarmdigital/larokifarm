import { prisma } from '@/shared/lib/prisma';
import type { ResenaRepository } from '@/core/farmacias/domain';

export const resenaRepositoryPrisma: ResenaRepository = {
  async findVisibleAvatarKey(resenaId) {
    const row = await prisma.resena.findFirst({
      where: { id: resenaId, oculta: false, eliminadaEnGoogle: false },
      select: { avatarStorageKey: true },
    });
    return row?.avatarStorageKey ?? null;
  },
};
