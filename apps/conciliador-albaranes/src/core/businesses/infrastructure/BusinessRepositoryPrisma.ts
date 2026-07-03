import { Prisma } from '@prisma/client';
import { prisma } from '@/shared/lib/prisma';
import { decrypt, encrypt } from '@/shared/lib/crypto';
import type {
  BusinessRow,
  CreateBusinessInput,
  UpdateBusinessInput,
} from '../domain/models/Business';
import type { BusinessRepository } from '../domain/repositories/BusinessRepository';

const BUSINESS_SELECT = {
  id: true,
  slug: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  geminiKeyEnc: true,
  monthlyBudgetUsd: true,
  supportEmail: true,
} satisfies Prisma.BusinessSelect;

function toRow(row: {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  geminiKeyEnc: string | null;
  monthlyBudgetUsd: Prisma.Decimal | null;
  supportEmail: string | null;
}): BusinessRow {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    hasGeminiKey: !!row.geminiKeyEnc,
    monthlyBudgetUsd: row.monthlyBudgetUsd ? Number(row.monthlyBudgetUsd) : null,
    supportEmail: row.supportEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class BusinessRepositoryPrisma implements BusinessRepository {
  async list(): Promise<BusinessRow[]> {
    const rows = await prisma.business.findMany({
      orderBy: { name: 'asc' },
      select: BUSINESS_SELECT,
    });
    return rows.map(toRow);
  }

  async findById(id: string): Promise<BusinessRow | null> {
    const row = await prisma.business.findUnique({
      where: { id },
      select: BUSINESS_SELECT,
    });
    return row ? toRow(row) : null;
  }

  async findBySlug(slug: string): Promise<BusinessRow | null> {
    const row = await prisma.business.findUnique({
      where: { slug },
      select: BUSINESS_SELECT,
    });
    return row ? toRow(row) : null;
  }

  async create(input: CreateBusinessInput): Promise<BusinessRow> {
    const row = await prisma.business.create({
      data: { slug: input.slug, name: input.name },
      select: BUSINESS_SELECT,
    });
    return toRow(row);
  }

  async update(id: string, input: UpdateBusinessInput): Promise<BusinessRow> {
    const data: Prisma.BusinessUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.geminiApiKey !== undefined) {
      data.geminiKeyEnc = input.geminiApiKey
        ? await encrypt(input.geminiApiKey)
        : null;
    }
    if (input.monthlyBudgetUsd !== undefined) {
      data.monthlyBudgetUsd = input.monthlyBudgetUsd;
    }
    if (input.supportEmail !== undefined) {
      data.supportEmail = input.supportEmail;
    }
    const row = await prisma.business.update({
      where: { id },
      data,
      select: BUSINESS_SELECT,
    });
    return toRow(row);
  }

  async delete(id: string): Promise<void> {
    await prisma.business.delete({ where: { id } });
  }

  async getDecryptedGeminiKey(id: string): Promise<string | null> {
    const row = await prisma.business.findUnique({
      where: { id },
      select: { geminiKeyEnc: true },
    });
    if (!row?.geminiKeyEnc) return null;
    return decrypt(row.geminiKeyEnc);
  }
}
