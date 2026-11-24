import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { auth, puedeUsarModulo } from '@/core/auth';
import { FARMACIAS, TIPO_PRODUCTO_LABEL, getPriceListRepository } from '@/core/precios';
import { ymdMadrid } from '@/shared/lib/fechasMadrid';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Excel de una comparación: se genera al momento con lo guardado (no caduca). */
export async function GET(_req: Request, { params }: { params: Promise<{ runId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!(await puedeUsarModulo(session.user.id, 'comparador'))) {
    return NextResponse.json({ error: 'No tienes activado el comparador de precios.' }, { status: 403 });
  }
  const { runId } = await params;
  const repo = getPriceListRepository();
  const run = await repo.ejecucion(runId);
  const lista = run ? await repo.obtener(run.listaId) : null;
  if (!run || !lista) return NextResponse.json({ error: 'Esa comparación ya no existe.' }, { status: 404 });

  const filas = await repo.todosResultados(runId);
  const nombre = Object.fromEntries(FARMACIAS.map((f) => [f.clave, f.nombre]));
  const datos = filas.map((f) => ({
    CN: f.cn,
    Producto: f.producto?.nombre ?? f.nombreExcel ?? '',
    Tipo: f.producto ? TIPO_PRODUCTO_LABEL[f.producto.tipo] : '',
    'Precio oficial': f.precioOficial ?? '',
    'Mejor precio verificado': f.mejorPrecio ?? '',
    'Farmacia del mejor precio': f.mejorFarmacia ? (nombre[f.mejorFarmacia] ?? f.mejorFarmacia) : '',
    'Enlace a la ficha': f.mejorUrl ?? '',
    'Farmacias con precio': f.producto?.tipo === 'receta' ? '' : `${f.conPrecio} de ${f.consultadas}`,
    'Consultado el': f.consultadoEn ? new Date(f.consultadoEn).toLocaleString('es-ES', { timeZone: 'Europe/Madrid' }) : '',
    Estado: f.estado === 'hecho' ? (f.reutilizado ? 'Hecho (precio de las últimas 24 h)' : 'Hecho') : f.estado === 'error' ? 'Error' : 'Pendiente',
    ...Object.fromEntries(FARMACIAS.map((fa) => [fa.nombre, f.porFarmacia?.[fa.clave] ?? ''])),
  }));
  const hoja = XLSX.utils.json_to_sheet(datos);
  hoja['!cols'] = [{ wch: 8 }, { wch: 50 }, { wch: 13 }, { wch: 12 }, { wch: 14 }, { wch: 22 }, { wch: 40 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, ...FARMACIAS.map(() => ({ wch: 12 }))];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, hoja, 'Precios');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  const archivo = `${lista.lista.nombre.replace(/[\\/:*?"<>|]+/g, ' ').trim()} – precios ${ymdMadrid(new Date(run.creadaEn)).split('-').reverse().join('-')}.xlsx`;
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="precios.xlsx"; filename*=UTF-8''${encodeURIComponent(archivo)}`,
      'cache-control': 'private, no-store',
    },
  });
}
