import 'server-only';
import { decrypt } from '@/shared/lib/crypto';
import { prisma } from '@/shared/lib/prisma';

export type UsoIaFarmacia = {
  id: string;
  nombre: string;
  /** Coste de Gemini del mes elegido (conciliaciones + traducciones), en dólares. */
  gastoMes: number;
  /** Límite actual; null = sin límite. */
  limiteMes: number | null;
  /** Gasto / límite en % (null si no hay límite). */
  porcentaje: number | null;
  conciliacionesMes: number;
  pdfsMes: number;
  traduccionesMes: number;
  /** Últimas 4 letras de su clave propia; null = usa la general. '' = la tiene pero no se puede leer. */
  finClave: string | null;
};

export type UsoIaPersona = {
  /** null = usos sin persona asociada. */
  id: string | null;
  nombre: string;
  email: string | null;
  /** Farmacias en las que ha gastado este mes. */
  farmacias: string[];
  conciliaciones: number;
  pdfs: number;
  traducciones: number;
  gasto: number;
};

export type UsoIaMes = {
  clave: string;
  etiqueta: string;
  corta: string;
  gasto: number;
  usos: number;
  conciliaciones: number;
  traducciones: number;
};

export type UsoIaData = {
  /** "2026-11" */
  mes: string;
  /** "noviembre de 2026" */
  mesEtiqueta: string;
  esMesActual: boolean;
  /** Últimos 12 meses, del más antiguo al actual. */
  meses: UsoIaMes[];
  total: { gastoMes: number; conciliacionesMes: number; pdfsMes: number; traduccionesMes: number };
  /** El servidor tiene clave general (GEMINI_API_KEY). Sin ella, solo funcionan las farmacias con clave propia. */
  hayClaveGeneral: boolean;
  /** El servidor puede cifrar claves propias (ENCRYPTION_KEY). */
  puedeGuardarClaves: boolean;
  farmacias: UsoIaFarmacia[];
  personas: UsoIaPersona[];
};

const MESES_HISTORIA = 12;

const claveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const sumarMeses = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
const fmtLargo = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtCorto = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: 'UTC' });

async function finDeClave(cifrada: string | null): Promise<string | null> {
  if (!cifrada) return null;
  try {
    return (await decrypt(cifrada)).slice(-4);
  } catch {
    return '';
  }
}

type Uso = { createdAt: Date; coste: number; userId: string | null; businessId: string; pdfs: number; esConciliacion: boolean };

/**
 * Solo para /admin/uso (la página ya comprueba que es la cuenta de administración).
 * `mesPedido` = "AAAA-MM" de los últimos 12 meses; cualquier otro valor → mes actual.
 * Lee una vez los usos de 12 meses (conciliaciones + traducciones) y agrupa en memoria.
 */
export async function getUsoIaData(mesPedido?: string): Promise<UsoIaData> {
  const hoy = new Date();
  const mesActual = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 1));
  const inicioHistoria = sumarMeses(mesActual, -(MESES_HISTORIA - 1));
  const claves = Array.from({ length: MESES_HISTORIA }, (_, i) => claveMes(sumarMeses(inicioHistoria, i)));
  const mes = mesPedido && claves.includes(mesPedido) ? mesPedido : claveMes(mesActual);

  const [negocios, conciliaciones, traducciones] = await Promise.all([
    prisma.business.findMany({
      select: { id: true, name: true, monthlyBudgetUsd: true, geminiKeyEnc: true },
      orderBy: { name: 'asc' },
    }),
    prisma.comparison.findMany({
      where: { createdAt: { gte: inicioHistoria } },
      select: { createdAt: true, geminiCostUsd: true, userId: true, businessId: true, numPdfs: true },
    }),
    // `::text` para no fallar si la BD aún no tiene TRADUCCION en el enum.
    prisma.$queryRaw<{ createdAt: Date; costUsd: unknown; userId: string | null; businessId: string }[]>`
      SELECT "createdAt", "costUsd", "userId", "businessId" FROM "usage_entries"
      WHERE "module"::text = 'TRADUCCION' AND "createdAt" >= ${inicioHistoria}`,
  ]);

  const usos: Uso[] = [
    ...conciliaciones.map((c) => ({
      createdAt: c.createdAt,
      coste: Number(c.geminiCostUsd),
      userId: c.userId,
      businessId: c.businessId,
      pdfs: c.numPdfs,
      esConciliacion: true,
    })),
    ...traducciones.map((t) => ({
      createdAt: t.createdAt,
      coste: Number(t.costUsd ?? 0),
      userId: t.userId,
      businessId: t.businessId,
      pdfs: 0,
      esConciliacion: false,
    })),
  ];

  const porMes = new Map(claves.map((k) => [k, { gasto: 0, usos: 0, conciliaciones: 0, traducciones: 0 }]));
  for (const u of usos) {
    const m = porMes.get(claveMes(u.createdAt));
    if (m) {
      m.gasto += u.coste;
      m.usos += 1;
      if (u.esConciliacion) m.conciliaciones += 1;
      else m.traducciones += 1;
    }
  }
  const delMes = usos.filter((u) => claveMes(u.createdAt) === mes);
  const nombreNegocio = new Map(negocios.map((b) => [b.id, b.name]));

  const farmacias = await Promise.all(
    negocios.map(async (b): Promise<UsoIaFarmacia> => {
      const suyos = delMes.filter((u) => u.businessId === b.id);
      const gastoMes = suyos.reduce((s, u) => s + u.coste, 0);
      const limiteMes = b.monthlyBudgetUsd ? Number(b.monthlyBudgetUsd) : null;
      return {
        id: b.id,
        nombre: b.name,
        gastoMes,
        limiteMes,
        porcentaje: limiteMes && limiteMes > 0 ? Math.round((gastoMes / limiteMes) * 100) : null,
        conciliacionesMes: suyos.filter((u) => u.esConciliacion).length,
        pdfsMes: suyos.reduce((s, u) => s + u.pdfs, 0),
        traduccionesMes: suyos.filter((u) => !u.esConciliacion).length,
        finClave: await finDeClave(b.geminiKeyEnc),
      };
    }),
  );

  const grupos = new Map<string, Omit<UsoIaPersona, 'nombre' | 'email' | 'farmacias'> & { negocios: Set<string> }>();
  for (const u of delMes) {
    const k = u.userId ?? '';
    const g = grupos.get(k) ?? { id: u.userId, conciliaciones: 0, pdfs: 0, traducciones: 0, gasto: 0, negocios: new Set<string>() };
    if (u.esConciliacion) g.conciliaciones += 1;
    else g.traducciones += 1;
    g.pdfs += u.pdfs;
    g.gasto += u.coste;
    g.negocios.add(u.businessId);
    grupos.set(k, g);
  }
  const ids = [...grupos.keys()].filter(Boolean);
  const usuarios = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
    : [];
  const usuario = new Map(usuarios.map((u) => [u.id, u]));
  const personas: UsoIaPersona[] = [...grupos.values()]
    .map(({ negocios: ns, ...g }) => {
      const u = g.id ? usuario.get(g.id) : undefined;
      return {
        ...g,
        nombre: u?.name ?? (g.id ? 'Cuenta eliminada' : 'Sin persona asociada'),
        email: u?.email ?? null,
        farmacias: [...ns].map((id) => nombreNegocio.get(id) ?? '—').sort((a, b) => a.localeCompare(b, 'es')),
      };
    })
    .sort((a, b) => b.gasto - a.gasto || b.conciliaciones + b.traducciones - (a.conciliaciones + a.traducciones));

  const [anio, mesNum] = mes.split('-').map(Number) as [number, number];
  const inicioMes = new Date(Date.UTC(anio, mesNum - 1, 1));

  return {
    mes,
    mesEtiqueta: fmtLargo.format(inicioMes),
    esMesActual: mes === claveMes(mesActual),
    meses: claves.map((k) => {
      const [a, m] = k.split('-').map(Number) as [number, number];
      const d = new Date(Date.UTC(a, m - 1, 1));
      const v = porMes.get(k)!;
      return { clave: k, etiqueta: fmtLargo.format(d), corta: fmtCorto.format(d).replace('.', ''), ...v };
    }),
    total: {
      gastoMes: farmacias.reduce((s, f) => s + f.gastoMes, 0),
      conciliacionesMes: farmacias.reduce((s, f) => s + f.conciliacionesMes, 0),
      pdfsMes: farmacias.reduce((s, f) => s + f.pdfsMes, 0),
      traduccionesMes: farmacias.reduce((s, f) => s + f.traduccionesMes, 0),
    },
    hayClaveGeneral: !!process.env.GEMINI_API_KEY,
    puedeGuardarClaves: !!process.env.ENCRYPTION_KEY,
    farmacias,
    personas,
  };
}
