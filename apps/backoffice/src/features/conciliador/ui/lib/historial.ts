/**
 * Utilidades del historial de conciliaciones. Las fechas se agrupan y filtran
 * en hora de Madrid: el servidor (Vercel) va en UTC y una conciliación de las
 * 00:30 caería en el día anterior.
 */

export const ZONA = 'Europe/Madrid';

/** Claves de la URL que cuentan como filtro (page no). `supplier` = URL antigua. */
export const CLAVES_FILTRO = ['q', 'supplier', 'periodo', 'from', 'to', 'status', 'reportes', 'business'] as const;

export type Periodo = 'hoy' | '7d' | '30d' | 'fechas';

export const PERIODOS: { id: Exclude<Periodo, 'fechas'>; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: '7d', label: 'Últimos 7 días' },
  { id: '30d', label: 'Últimos 30 días' },
];

const YMD = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' });
const HORA = new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, hour: '2-digit', minute: '2-digit' });
const DIA = new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'short' });
const DIA_CON_ANYO = new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
const OFFSET = new Intl.DateTimeFormat('en-US', { timeZone: ZONA, timeZoneName: 'longOffset' });

/** "2026-11-20" del día en Madrid. */
export function ymdMadrid(d: Date): string {
  return YMD.format(d);
}

const FECHA_HORA = new Intl.DateTimeFormat('es-ES', { timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** "19 nov 2026, 11:14" en hora de Madrid. */
export function fechaHoraMadrid(d: Date): string {
  return FECHA_HORA.format(d);
}

export function horaMadrid(d: Date): string {
  return HORA.format(d);
}

function sumarDias(ymd: string, dias: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + dias, 12));
  return t.toISOString().slice(0, 10);
}

/** Instante (UTC) en que empieza ese día en Madrid. */
function inicioDia(ymd: string): Date | undefined {
  const mediodia = new Date(`${ymd}T12:00:00Z`);
  const off = OFFSET.formatToParts(mediodia).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT';
  // Años antiguos dan offsets LMT ("GMT-0:14:44") que no son ISO válidos → fecha inválida
  const offset = off === 'GMT' ? '+00:00' : off.replace('GMT', '');
  const d = new Date(`${ymd}T00:00:00${offset}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function esYmd(v: string | undefined): v is string {
  // Solo años 2000-2099: fechas a medio teclear ("0002-01-01") rompían la consulta (HTTP 500).
  return !!v && /^20\d{2}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T12:00:00Z`).getTime());
}

function finDe(ymd: string): Date | undefined {
  const siguiente = inicioDia(sumarDias(ymd, 1));
  return siguiente ? new Date(siguiente.getTime() - 1) : undefined;
}

/** Rango [desde, hasta] para el repositorio según el periodo elegido. */
export function rangoPeriodo(
  periodo: Periodo | undefined,
  desde: string | undefined,
  hasta: string | undefined,
  ahora = new Date(),
): { from?: Date; to?: Date } {
  const hoy = ymdMadrid(ahora);
  const dias = periodo === 'hoy' ? 0 : periodo === '7d' ? 6 : periodo === '30d' ? 29 : null;
  if (dias !== null) return { from: inicioDia(sumarDias(hoy, -dias)) };
  if (periodo === 'fechas') {
    return {
      from: esYmd(desde) ? inicioDia(desde) : undefined,
      // "hasta" incluye todo ese día
      to: esYmd(hasta) ? finDe(hasta) : undefined,
    };
  }
  return {};
}

/** "Hoy", "Ayer", "Martes 17 nov" (con año si no es el actual). */
export function etiquetaDia(ymd: string, ahora = new Date()): string {
  const hoy = ymdMadrid(ahora);
  if (ymd === hoy) return 'Hoy';
  if (ymd === sumarDias(hoy, -1)) return 'Ayer';
  const fecha = new Date(`${ymd}T12:00:00Z`);
  const txt = (ymd.slice(0, 4) === hoy.slice(0, 4) ? DIA : DIA_CON_ANYO).format(fecha).replace(',', '');
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function agruparPorDia<T extends { createdAt: Date }>(items: T[]): { ymd: string; items: T[] }[] {
  const grupos: { ymd: string; items: T[] }[] = [];
  for (const it of items) {
    const ymd = ymdMadrid(it.createdAt);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.ymd === ymd) ultimo.items.push(it);
    else grupos.push({ ymd, items: [it] });
  }
  return grupos;
}
