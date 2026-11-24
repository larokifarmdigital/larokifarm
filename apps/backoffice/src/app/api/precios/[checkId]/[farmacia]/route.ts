import { NextResponse } from 'next/server';
import { auth, puedeUsarModulo } from '@/core/auth';
import { consultarFarmacia, farmaciaPorClave, farmaciasPara, getPriceCheckRepository } from '@/core/precios';

export const runtime = 'nodejs';
// Una farmacia por petición: el navegador lanza todas en paralelo (las server
// actions de Next van en cola, una detrás de otra).
export const maxDuration = 60;

export async function POST(_req: Request, { params }: { params: Promise<{ checkId: string; farmacia: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!(await puedeUsarModulo(session.user.id, 'comparador'))) {
    return NextResponse.json({ error: 'No tienes activado el comparador de precios.' }, { status: 403 });
  }
  const { checkId, farmacia } = await params;
  const r = await consultarFarmacia(checkId, farmacia, { repo: getPriceCheckRepository(), farmaciaPorClave, farmaciasPara });
  return r.ok ? NextResponse.json({ oferta: r.oferta }) : NextResponse.json({ error: r.error }, { status: r.status });
}
