'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import * as XLSX from 'xlsx';
import { getCurrentUser, puedeUsarModulo } from '@/core/auth';
import {
  ListaActivaError,
  ListaInvalidaError,
  REUTILIZAR_MS,
  ejecucionParada,
  estimarSegundos,
  getPriceListRepository,
  lanzarEjecucion,
  procesarComparacion,
  validarLista,
  type FilaDescartada,
  type ListaValidada,
} from '@/core/precios';

const SIN_PERMISO = 'No tienes activado el comparador de precios.';
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONES = /\.(xlsx|xls|csv)$/i;

async function usuarioConModulo() {
  const u = await getCurrentUser();
  if (!u || !(await puedeUsarModulo(u.id, 'comparador'))) return null;
  return u;
}

/** Lee la primera hoja y valida. Lanza ListaInvalidaError con el texto para el usuario. */
async function leer(archivo: unknown): Promise<{ nombreArchivo: string; v: ListaValidada }> {
  if (!(archivo instanceof File) || archivo.size === 0) throw new ListaInvalidaError('El archivo está vacío.');
  if (!EXTENSIONES.test(archivo.name)) throw new ListaInvalidaError('Este archivo no es un Excel ni un CSV. Sube un .xlsx, .xls o .csv.');
  if (archivo.size > MAX_BYTES) throw new ListaInvalidaError('El archivo pesa más de 5 MB. Quítale columnas que no hagan falta o divídelo.');
  let matriz: unknown[][];
  try {
    const wb = XLSX.read(new Uint8Array(await archivo.arrayBuffer()), { type: 'array', cellDates: false });
    const hoja = wb.Sheets[wb.SheetNames[0]];
    matriz = hoja ? XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: '', raw: false, blankrows: false }) : [];
  } catch {
    throw new ListaInvalidaError('No hemos podido abrir el archivo. Si tiene contraseña, quítasela y vuelve a subirlo.');
  }
  if (matriz.length === 0) throw new ListaInvalidaError('El archivo está vacío.');
  return { nombreArchivo: archivo.name, v: validarLista(matriz) };
}

export type VistaPrevia =
  | {
      ok: true;
      nombreArchivo: string;
      validas: number;
      descartadas: FilaDescartada[];
      totalDescartadas: number;
      motivos: { motivo: string; n: number }[];
      columnas: ListaValidada['columnas'];
      segundos: number;
    }
  | { ok: false; error: string; descartadas?: FilaDescartada[] };

const motivoCorto = (m: string) => m.replace(/ \(ya está en la fila \d+\)$/, '');

export async function previsualizarListaAction(fd: FormData): Promise<VistaPrevia> {
  if (!(await usuarioConModulo())) return { ok: false, error: SIN_PERMISO };
  try {
    const { nombreArchivo, v } = await leer(fd.get('archivo'));
    if (v.validas.length === 0) {
      return { ok: false, error: 'Ninguna fila tiene un código nacional válido, así que no hay nada que comparar.', descartadas: v.descartadas.slice(0, 100) };
    }
    const recientes = await getPriceListRepository().cuantosRecientes(v.validas.map((f) => f.cn), REUTILIZAR_MS);
    const motivos = new Map<string, number>();
    for (const d of v.descartadas) motivos.set(motivoCorto(d.motivo), (motivos.get(motivoCorto(d.motivo)) ?? 0) + 1);
    return {
      ok: true,
      nombreArchivo,
      validas: v.validas.length,
      descartadas: v.descartadas.slice(0, 100),
      totalDescartadas: v.descartadas.length,
      motivos: [...motivos].map(([motivo, n]) => ({ motivo, n })).sort((a, b) => b.n - a.n),
      columnas: v.columnas,
      segundos: estimarSegundos(v.validas.length - recientes),
    };
  } catch (e) {
    if (e instanceof ListaInvalidaError) return { ok: false, error: e.message };
    console.error('[precios] vista previa', (e as Error).name);
    return { ok: false, error: 'No hemos podido leer el archivo. Vuelve a intentarlo.' };
  }
}

/** "Subir y comparar": guarda la lista y pone en marcha su primera comparación. */
export async function guardarListaAction(
  fd: FormData,
): Promise<{ ok: true; id: string; error?: string } | { ok: false; error: string; campo?: 'nombre' }> {
  const u = await usuarioConModulo();
  if (!u) return { ok: false, error: SIN_PERMISO };
  const nombre = String(fd.get('nombre') ?? '').trim();
  if (!nombre) return { ok: false, error: 'Ponle un nombre a la lista.', campo: 'nombre' };
  if (nombre.length > 80) return { ok: false, error: 'Máximo 80 caracteres.', campo: 'nombre' };
  try {
    // El servidor vuelve a validar: no se fía de la vista previa.
    const { nombreArchivo, v } = await leer(fd.get('archivo'));
    if (v.validas.length === 0) return { ok: false, error: 'Ninguna fila tiene un código nacional válido.' };
    const id = await getPriceListRepository().crear({ userId: u.id, nombre, archivo: nombreArchivo, filas: v.validas });
    console.info(JSON.stringify({ evento: 'precios-lista', accion: 'crear', actorId: u.id, listaId: id, productos: v.validas.length }));
    const repo = getPriceListRepository();
    const runId = await repo.crearEjecucion(id, u.id, () => false);
    const r = await ponerEnMarcha(runId, v.validas.length);
    revalidatePath('/scout/listas');
    // La lista queda guardada aunque no arranque: el error se ve en su página.
    return { ok: true, id, ...(r.ok ? {} : { error: r.error }) };
  } catch (e) {
    if (e instanceof ListaInvalidaError) return { ok: false, error: e.message };
    console.error('[precios] guardar lista', (e as Error).name);
    return { ok: false, error: 'No se ha podido guardar la lista. Vuelve a intentarlo.' };
  }
}

export type ResultadoLanzar = { ok: true } | { ok: false; error: string };

const NO_ARRANCA = 'No hemos podido poner en marcha la comparación. Vuelve a intentarlo en unos minutos.';

/** Hasta aquí se compara en el propio backoffice (cabe en los 5 min de Vercel: ~32 productos/min). */
const LIMITE_DIRECTO = 50;

/**
 * Pone a trabajar una comparación ya creada:
 * - Lista pequeña (o en local sin token): en el propio servidor, después de
 *   responder (`after`), así el usuario ve el progreso al momento.
 * - Lista grande: GitHub Actions (puede tardar más de una hora).
 */
async function ponerEnMarcha(runId: string, total: number): Promise<ResultadoLanzar> {
  const enLocal = process.env.NODE_ENV !== 'production' && !process.env.GITHUB_DISPATCH_TOKEN;
  if (total <= LIMITE_DIRECTO || enLocal) {
    after(() =>
      procesarComparacion(runId).catch((e) => console.error('[precios] comparación directa', (e as Error).name)),
    );
    return { ok: true };
  }
  const l = await lanzarEjecucion(runId);
  if (l === 'lanzada') return { ok: true };
  const error =
    l === 'sin_configurar'
      ? `Las listas de más de ${LIMITE_DIRECTO} productos se comparan en segundo plano y eso todavía no está activado (falta el token de GitHub). Divide la lista o avisa al administrador.`
      : NO_ARRANCA;
  await getPriceListRepository().fallar(runId, error);
  return { ok: false, error };
}

export async function compararListaAction(listId: unknown): Promise<ResultadoLanzar> {
  const u = await usuarioConModulo();
  if (!u) return { ok: false, error: SIN_PERMISO };
  if (typeof listId !== 'string') return { ok: false, error: 'Petición no válida.' };
  const repo = getPriceListRepository();
  try {
    const runId = await repo.crearEjecucion(listId, u.id, (e) => !ejecucionParada(e));
    console.info(JSON.stringify({ evento: 'precios-lista', accion: 'comparar', actorId: u.id, listaId: listId, runId }));
    const total = (await repo.ejecucion(runId))?.total ?? 0;
    const r = await ponerEnMarcha(runId, total);
    revalidatePath(`/scout/listas/${listId}`);
    return r;
  } catch (e) {
    if (e instanceof ListaActivaError) return { ok: false, error: e.message };
    console.error('[precios] comparar lista', (e as Error).name);
    return { ok: false, error: NO_ARRANCA };
  }
}

async function ejecucionDeLista(runId: unknown) {
  if (typeof runId !== 'string') return null;
  return getPriceListRepository().ejecucion(runId);
}

export async function cancelarComparacionAction(runId: unknown): Promise<ResultadoLanzar> {
  const u = await usuarioConModulo();
  if (!u) return { ok: false, error: SIN_PERMISO };
  const e = await ejecucionDeLista(runId);
  if (!e || !(await getPriceListRepository().cancelar(e.id))) return { ok: false, error: 'Esta comparación ya no está en marcha.' };
  revalidatePath(`/scout/listas/${e.listaId}`);
  return { ok: true };
}

export async function reanudarComparacionAction(runId: unknown): Promise<ResultadoLanzar> {
  const u = await usuarioConModulo();
  if (!u) return { ok: false, error: SIN_PERMISO };
  const e = await ejecucionDeLista(runId);
  if (!e || (e.estado !== 'con_error' && !ejecucionParada(e))) return { ok: false, error: 'Esta comparación no se puede reanudar.' };
  const repo = getPriceListRepository();
  if (!(await repo.reanudar(e.id))) return { ok: false, error: 'Esta comparación no se puede reanudar.' };
  const r = await ponerEnMarcha(e.id, e.total - e.hechos);
  revalidatePath(`/scout/listas/${e.listaId}`);
  return r;
}

export async function renombrarListaAction(listId: unknown, nombre: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await usuarioConModulo())) return { ok: false, error: SIN_PERMISO };
  const n = typeof nombre === 'string' ? nombre.trim() : '';
  if (typeof listId !== 'string' || !n) return { ok: false, error: 'Ponle un nombre a la lista.' };
  if (n.length > 80) return { ok: false, error: 'Máximo 80 caracteres.' };
  await getPriceListRepository().renombrar(listId, n);
  revalidatePath('/scout/listas');
  revalidatePath(`/scout/listas/${listId}`);
  return { ok: true };
}

export async function eliminarListaAction(listId: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const u = await usuarioConModulo();
  if (!u) return { ok: false, error: SIN_PERMISO };
  if (typeof listId !== 'string') return { ok: false, error: 'Petición no válida.' };
  const repo = getPriceListRepository();
  const l = await repo.obtener(listId);
  if (!l) return { ok: false, error: 'Esa lista ya no existe.' };
  const activa = l.ejecuciones.some((e) => (e.estado === 'en_cola' || e.estado === 'comparando') && !ejecucionParada(e));
  if (activa) return { ok: false, error: 'Cancela la comparación para poder eliminarla.' };
  await repo.eliminar(listId);
  console.info(JSON.stringify({ evento: 'precios-lista', accion: 'eliminar', actorId: u.id, listaId: listId }));
  revalidatePath('/scout/listas');
  return { ok: true };
}
