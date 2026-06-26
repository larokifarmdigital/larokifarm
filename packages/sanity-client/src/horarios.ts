export type DiaSemana = 'Mo' | 'Tu' | 'We' | 'Th' | 'Fr' | 'Sa' | 'Su';

export type HorarioDia = {
  dia: DiaSemana;
  apertura?: string;
  cierre?: string;
  cerrado?: boolean;
};

export type GrupoHorario = { etiqueta: string; horario: string };

export type DiasI18n = Record<DiaSemana, string> & { a: string };

const ORDEN_DIAS: DiaSemana[] = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const INDICE_DIAS: Record<DiaSemana, number> = {
  Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6,
};

const DIAS_FALLBACK_ES: DiasI18n = {
  Mo: 'lunes', Tu: 'martes', We: 'miércoles', Th: 'jueves',
  Fr: 'viernes', Sa: 'sábado', Su: 'domingo',
  a: 'a',
};

function capitalizar(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function claveHorario(h: HorarioDia): string {
  if (h.cerrado) return 'cerrado';
  return `${h.apertura ?? ''}-${h.cierre ?? ''}`;
}

function formateaHorario(h: HorarioDia, etiquetaCerrado: string): string {
  if (h.cerrado) return etiquetaCerrado;
  if (h.apertura && h.cierre) return `${h.apertura} - ${h.cierre}`;
  return '—';
}

/**
 * Agrupa días con el mismo horario en rangos contiguos (ej. "Lunes - Viernes: 09:00 - 14:00").
 */
export function agruparHorarios(
  horarios?: HorarioDia[],
  diasI18n: DiasI18n = DIAS_FALLBACK_ES,
  etiquetaCerrado = 'Cerrado',
): GrupoHorario[] {
  if (!horarios?.length) return [];
  const porDia = new Map<DiaSemana, HorarioDia>();
  horarios.forEach((h) => porDia.set(h.dia, h));

  const grupos: GrupoHorario[] = [];
  let inicioIdx: number | null = null;
  let claveActual: string | null = null;

  const cerrar = (finIdx: number) => {
    if (inicioIdx === null || claveActual === null) return;
    const diaInicio = diasI18n[ORDEN_DIAS[inicioIdx]];
    const diaFin = diasI18n[ORDEN_DIAS[finIdx]];
    const etiqueta =
      inicioIdx === finIdx
        ? capitalizar(diaInicio)
        : `${capitalizar(diaInicio)} - ${diaFin}`;
    const dato = porDia.get(ORDEN_DIAS[inicioIdx])!;
    grupos.push({ etiqueta, horario: formateaHorario(dato, etiquetaCerrado) });
  };

  ORDEN_DIAS.forEach((dia, idx) => {
    const dato = porDia.get(dia);
    if (!dato) {
      if (claveActual !== null) {
        cerrar(idx - 1);
        inicioIdx = null;
        claveActual = null;
      }
      return;
    }
    const clave = claveHorario(dato);
    if (claveActual === null) {
      inicioIdx = idx;
      claveActual = clave;
    } else if (clave !== claveActual) {
      cerrar(idx - 1);
      inicioIdx = idx;
      claveActual = clave;
    }
  });

  if (claveActual !== null && inicioIdx !== null) {
    cerrar(ORDEN_DIAS.length - 1);
  }

  return grupos;
}

/**
 * Devuelve una descripción corta del rango de días abiertos
 * (ej. "Lunes a viernes", "Lunes, miércoles, viernes").
 */
export function rangoDiasAbiertos(
  horarios?: HorarioDia[],
  diasI18n: DiasI18n = DIAS_FALLBACK_ES,
): string | undefined {
  if (!horarios?.length) return undefined;
  const abiertos = new Set(
    horarios.filter((h) => !h.cerrado).map((h) => INDICE_DIAS[h.dia]),
  );
  if (abiertos.size === 0) return undefined;

  const indices = [...abiertos].sort((a, b) => a - b);
  const min = indices[0];
  const max = indices[indices.length - 1];

  let contiguo = true;
  for (let i = min; i <= max; i++) {
    if (!abiertos.has(i)) {
      contiguo = false;
      break;
    }
  }

  if (min === max) return capitalizar(diasI18n[ORDEN_DIAS[min]]);
  if (contiguo) {
    return `${capitalizar(diasI18n[ORDEN_DIAS[min]])} ${diasI18n.a} ${diasI18n[ORDEN_DIAS[max]]}`;
  }
  return indices.map((i) => capitalizar(diasI18n[ORDEN_DIAS[i]])).join(', ');
}
