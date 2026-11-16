/**
 * GET /api/public/farmacias/:slug/resenas — reseñas no ocultas, recientes primero.
 *
 * PÚBLICO, solo lectura, solo farmacias `published`. `enWeb` = cumple las
 * reglas del editor (la landing solo pinta esas; media y total, sobre todas).
 */
import { NextResponse } from 'next/server';
import { GetPublishedFarmaciaUseCase, getFarmaciaRepository, toLandingResenas } from '@/core/farmacias';
import { publicBaseUrl } from '@/shared/lib/publicBaseUrl';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const farmacia = await new GetPublishedFarmaciaUseCase(getFarmaciaRepository()).execute(slug);
  if (!farmacia) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(toLandingResenas(farmacia.resenas, publicBaseUrl(req), farmacia.resenasReglas), {
    headers: { 'Cache-Control': 'no-store' },
  });
}
