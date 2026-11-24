'use server';

import { getCurrentUser, puedeUsarModulo } from '@/core/auth';
import {
  catalogoFarmavazquez,
  cima,
  farmaciasPara,
  getPriceCheckRepository,
  identificarProducto,
  nomenclator,
  productoPorCn,
  registrarUsoComparador,
  type Candidato,
  type Producto,
} from '@/core/precios';

const SIN_PERMISO = 'No tienes activado el comparador de precios.';
const deps = { medicamentos: cima, parafarmacia: catalogoFarmavazquez };

export type FarmaciaConsulta = { clave: string; nombre: string };

export type ResultadoBusqueda =
  | {
      estado: 'producto';
      checkId: string;
      producto: Producto;
      precioOficial: number | null;
      farmacias: FarmaciaConsulta[];
      creadaEn: string;
    }
  | { estado: 'candidatos'; candidatos: Candidato[]; hayMas: boolean; texto: string }
  | { estado: 'error'; error: string };

async function usuarioConModulo() {
  const u = await getCurrentUser();
  if (!u || !(await puedeUsarModulo(u.id, 'comparador'))) return null;
  return u;
}

/** Guarda la consulta (con el precio oficial si es con receta) y devuelve qué farmacias consultar. */
async function abrirConsulta(userId: string, consulta: string, producto: Producto): Promise<ResultadoBusqueda> {
  const precioOficial = producto.tipo === 'receta' ? await nomenclator.deCn(producto.cn) : null;
  const farmacias = farmaciasPara(producto.tipo).map(({ clave, nombre }) => ({ clave, nombre }));
  const checkId = await getPriceCheckRepository().crear({ userId, consulta, producto, precioOficial });
  await registrarUsoComparador(userId, farmacias.length);
  return { estado: 'producto', checkId, producto, precioOficial, farmacias, creadaEn: new Date().toISOString() };
}

const ERROR_IDENTIFICAR = 'No hemos podido identificar el producto ahora mismo. Inténtalo de nuevo en unos minutos.';

export async function buscarProductoAction(texto: unknown): Promise<ResultadoBusqueda> {
  const u = await usuarioConModulo();
  if (!u) return { estado: 'error', error: SIN_PERMISO };
  const t = typeof texto === 'string' ? texto.trim().slice(0, 120) : '';
  if (!t) return { estado: 'error', error: 'Escribe un código o un nombre.' };
  try {
    const r = await identificarProducto(t, deps);
    switch (r.tipo) {
      case 'producto':
        return abrirConsulta(u.id, t, r.producto);
      case 'candidatos':
        return { estado: 'candidatos', candidatos: r.candidatos, hayMas: r.hayMas, texto: t };
      case 'invalida':
        return { estado: 'error', error: 'Escribe al menos 3 letras, o un código nacional (6 cifras) o un código de barras (13 cifras).' };
      case 'no_encontrado':
        return {
          estado: 'error',
          error:
            r.motivo === 'nombre'
              ? `No encontramos ningún producto con «${t}». Prueba con menos palabras o con el código nacional.`
              : r.motivo === 'ean_fabricante'
                ? 'Ese código de barras es del fabricante y no podemos saber con seguridad qué producto es. Busca por el código nacional (6 cifras) o por el nombre.'
                : `No encontramos ningún producto con el código ${t}. Revisa las cifras: están en la caja, junto al código de barras.`,
        };
    }
  } catch (e) {
    console.error('[precios] identificar', (e as Error).message);
    return { estado: 'error', error: ERROR_IDENTIFICAR };
  }
}

/** El usuario eligió un candidato (o "Volver a consultar"): se identifica por CN de nuevo en el servidor. */
export async function consultarCnAction(cn: unknown, consulta: unknown): Promise<ResultadoBusqueda> {
  const u = await usuarioConModulo();
  if (!u) return { estado: 'error', error: SIN_PERMISO };
  if (typeof cn !== 'string' || !/^\d{6}$/.test(cn)) return { estado: 'error', error: 'Código nacional no válido.' };
  try {
    const p = await productoPorCn(cn, deps);
    if (!p) return { estado: 'error', error: `No encontramos ningún producto con el código ${cn}.` };
    return abrirConsulta(u.id, typeof consulta === 'string' && consulta.trim() ? consulta.trim().slice(0, 120) : cn, p);
  } catch (e) {
    console.error('[precios] identificar', (e as Error).message);
    return { estado: 'error', error: ERROR_IDENTIFICAR };
  }
}
