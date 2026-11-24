// CIMA (AEMPS): identifica medicamentos por CN o nombre. La parafarmacia no está.
// Doc: https://cima.aemps.es/cima/rest/
import type { Candidato } from '../domain/models';
import type { CatalogoMedicamentos } from '../domain/ports';

const BASE = 'https://cima.aemps.es/cima/rest';

async function pedir<T>(ruta: string): Promise<T | null> {
  const res = await fetch(`${BASE}/${ruta}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`CIMA HTTP ${res.status}`);
  const t = (await res.text()).trim();
  return t ? (JSON.parse(t) as T) : null;
}

interface Presentacion {
  cn?: string;
  nombre?: string;
  cpresc?: string;
  comerc?: boolean;
}

const tipoDe = (cpresc: string | undefined, receta?: boolean) =>
  (receta ?? !/sin receta/i.test(cpresc ?? '')) ? ('receta' as const) : ('sin_receta' as const);

export const cima: CatalogoMedicamentos = {
  async porCn(cn) {
    const m = await pedir<{ nombre?: string; receta?: boolean; presentaciones?: Presentacion[] }>(`medicamento?cn=${encodeURIComponent(cn)}`);
    if (!m?.nombre) return null;
    // El nombre de la presentación incluye el formato ("…, 10 sobres").
    const pres = m.presentaciones?.find((p) => p.cn === cn);
    return { cn, nombre: pres?.nombre ?? m.nombre, tipo: tipoDe(pres?.cpresc, m.receta) };
  },
  async porNombre(texto) {
    const r = await pedir<{ resultados?: Presentacion[] }>(`presentaciones?nombre=${encodeURIComponent(texto)}&comerc=1`);
    return (r?.resultados ?? [])
      .filter((p): p is Presentacion & { cn: string; nombre: string } => !!p.cn && !!p.nombre)
      .map((p): Candidato => ({ cn: p.cn, nombre: p.nombre, tipo: tipoDe(p.cpresc) }));
  },
};
