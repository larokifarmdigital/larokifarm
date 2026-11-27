/**
 * GET /api/vista-previa/farmacias/:slug?t=<enlace firmado>
 *
 * Igual que /api/public/farmacias/:slug, pero con lo guardado de cualquier
 * farmacia (también en borrador) y solo con un enlace firmado por el editor
 * (`firmarVistaPrevia`). Lo pide la página /vista-previa de cada landing.
 */
import { NextResponse } from 'next/server';
import { GetFarmaciaVistaPreviaUseCase, getFarmaciaRepository, toLandingFarmacia } from '@/core/farmacias';
import { publicBaseUrl } from '@/shared/lib/publicBaseUrl';

export const dynamic = 'force-dynamic';

const CABECERAS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = new URL(req.url).searchParams.get('t');
  const r = await new GetFarmaciaVistaPreviaUseCase(getFarmaciaRepository()).execute(slug, token);
  if (!r.ok) {
    const status = r.reason === 'enlace-no-valido' ? 401 : 404;
    return NextResponse.json({ error: r.reason }, { status, headers: CABECERAS });
  }
  return NextResponse.json(toLandingFarmacia(r.farmacia, publicBaseUrl(req)), { headers: CABECERAS });
}
