import { prisma } from '@/shared/lib/prisma';
import type {
  ContentImageRecord,
  ContentImageRepository,
  CreateContentImageInput,
} from '@/core/farmacias/domain';

const SELECT = {
  id: true,
  businessId: true,
  role: true,
  storageKey: true,
  publicUrl: true,
  sizeBytes: true,
} as const;

export const contentImageRepositoryPrisma: ContentImageRepository = {
  async getBusinessSlug(businessId) {
    const b = await prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } });
    return b?.slug ?? null;
  },

  async findById(id): Promise<ContentImageRecord | null> {
    return prisma.contentImage.findUnique({ where: { id }, select: SELECT });
  },

  async create(input: CreateContentImageInput) {
    const last = await prisma.contentImage.findFirst({
      where: { businessId: input.businessId, role: input.role },
      orderBy: { orden: 'desc' },
      select: { orden: true },
    });
    return prisma.contentImage.create({
      data: {
        id: input.id,
        businessId: input.businessId,
        role: input.role,
        storageKey: input.storageKey,
        publicUrl: input.publicUrl,
        alt: input.alt as object,
        sizeBytes: input.sizeBytes,
        orden: last ? last.orden + 1 : 0,
      },
      select: SELECT,
    });
  },

  async delete(id) {
    await prisma.contentImage.delete({ where: { id } });
  },

  async countOwned(ids, businessId, role) {
    return prisma.contentImage.count({ where: { id: { in: ids }, businessId, role } });
  },

  async reorder(orderedIds) {
    await prisma.$transaction(
      orderedIds.map((id, i) => prisma.contentImage.update({ where: { id }, data: { orden: i } })),
    );
  },
};
