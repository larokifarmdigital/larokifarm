import { eanDeCn, interpretarBusqueda } from '../domain/codigos';
import type { Candidato, Producto } from '../domain/models';
import type { CatalogoMedicamentos, CatalogoParafarmacia } from '../domain/ports';

export const MAX_CANDIDATOS = 20;

export type Identificacion =
  | { tipo: 'producto'; producto: Producto }
  | { tipo: 'candidatos'; candidatos: Candidato[]; hayMas: boolean }
  | { tipo: 'no_encontrado'; motivo: 'codigo' | 'nombre' | 'ean_fabricante' }
  | { tipo: 'invalida' };

/**
 * Qué producto busca el usuario. Nunca adivina:
 * - CN (o EAN nacional 847000…): CIMA si es medicamento; si no, parafarmacia
 *   (nombre del catálogo de Farmavázquez).
 * - EAN de fabricante: no se puede pasar a CN de forma fiable → se pide CN o nombre.
 * - Nombre: candidatos de CIMA + parafarmacia para que el usuario elija.
 */
export async function identificarProducto(
  texto: string,
  deps: { medicamentos: CatalogoMedicamentos; parafarmacia: CatalogoParafarmacia },
): Promise<Identificacion> {
  const b = interpretarBusqueda(texto);
  if (!b) return { tipo: 'invalida' };
  if (b.tipo === 'ean') return { tipo: 'no_encontrado', motivo: 'ean_fabricante' };
  if (b.tipo === 'cn') {
    const p = await productoPorCn(b.cn, deps);
    return p ? { tipo: 'producto', producto: p } : { tipo: 'no_encontrado', motivo: 'codigo' };
  }
  const [meds, para] = await Promise.all([
    deps.medicamentos.porNombre(b.texto),
    // Si la web de parafarmacia falla, siguen valiendo los medicamentos.
    deps.parafarmacia.porNombre(b.texto).catch(() => [] as Candidato[]),
  ]);
  const vistos = new Set<string>();
  const todos = [...meds, ...para].filter((c) => !vistos.has(c.cn) && vistos.add(c.cn));
  if (todos.length === 0) return { tipo: 'no_encontrado', motivo: 'nombre' };
  return { tipo: 'candidatos', candidatos: todos.slice(0, MAX_CANDIDATOS), hayMas: todos.length > MAX_CANDIDATOS };
}

export async function productoPorCn(
  cn: string,
  deps: { medicamentos: CatalogoMedicamentos; parafarmacia: CatalogoParafarmacia },
): Promise<Producto | null> {
  const med = await deps.medicamentos.porCn(cn);
  // Los medicamentos llevan siempre el EAN nacional 847000 + CN.
  if (med) return { cn, ean: eanDeCn(cn), nombre: med.nombre, tipo: med.tipo };
  const para = await deps.parafarmacia.porCn(cn).catch(() => null);
  return para ? { cn, ean: null, nombre: para.nombre, tipo: 'parafarmacia' } : null;
}
