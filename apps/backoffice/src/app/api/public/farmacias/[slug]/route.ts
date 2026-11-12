/**
 * GET /api/public/farmacias/:slug — contenido de la landing de una farmacia.
 *
 * PÚBLICO y de solo lectura (sin sesión: `src/proxy.ts` no cubre /api).
 * Solo farmacias `published`; el resto → 404. Las landings Astro lo leen en
 * build. Contrato en core/farmacias/application/publicContent.ts.
 */
import { NextResponse } from 'next/server';
import { GetPublishedFarmaciaUseCase, getFarmaciaRepository, toLandingFarmacia } from '@/core/farmacias';
import { publicBaseUrl } from '@/shared/lib/publicBaseUrl';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const farmacia = await new GetPublishedFarmaciaUseCase(getFarmaciaRepository()).execute(slug);
  if (!farmacia) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(toLandingFarmacia(farmacia, publicBaseUrl(req)), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
