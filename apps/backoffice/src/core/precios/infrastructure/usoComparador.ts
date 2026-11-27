// Registro de uso del comparador en usage_entries (módulo SCOUT, coste 0: no
// usa servicios de pago). La farmacia a la que se apunta es fija y
// configurable: en local, Laguna.
import { prisma } from '@/shared/lib/prisma';

const SLUG = process.env.COMPARADOR_FARMACIA_USO || 'larokifarm';
let businessId: string | null | undefined;

export async function registrarUsoComparador(userId: string, farmaciasConsultadas: number): Promise<void> {
  try {
    if (businessId === undefined) {
      businessId = (await prisma.business.findUnique({ where: { slug: SLUG }, select: { id: true } }))?.id ?? null;
    }
    if (!businessId) {
      console.error('[precios] no existe la farmacia de uso', SLUG);
      return;
    }
    await prisma.usageEntry.create({
      data: { businessId, userId, module: 'SCOUT', action: 'compare', units: farmaciasConsultadas, costUsd: 0 },
    });
  } catch (e) {
    // El registro de uso nunca impide consultar.
    console.error('[precios] no se pudo registrar el uso', (e as { code?: string }).code ?? (e as Error).name);
  }
}
