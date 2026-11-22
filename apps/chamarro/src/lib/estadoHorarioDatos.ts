/** Datos para `calcularEstado` (estadoHorario.ts), preparados en el build. */
import type { HorarioDia } from '@/lib/sanity';
import { t, type Locale } from '@/lib/i18n';
import type { DiaEstado, TextosEstado } from './estadoHorario';

/** Normaliza los horarios: tramos reales si los hay; si no, la jornada completa. */
export function horariosParaEstado(horarios: HorarioDia[] | undefined): DiaEstado[] {
  return (horarios ?? []).map((h) => ({
    dia: h.dia,
    cerrado: Boolean(h.cerrado),
    tramos: (h.tramos?.length ? h.tramos : h.apertura && h.cierre ? [{ apertura: h.apertura, cierre: h.cierre }] : [])
      .filter((tr) => tr?.apertura && tr?.cierre),
  }));
}

export function textosEstado(lang: Locale): TextosEstado {
  return {
    abierto: t('hero.estado.abierto', lang),
    cerrado: t('hero.estado.cerrado', lang),
    cierra: t('hero.estado.cierra', lang, { hora: '{hora}' }),
    abreHoy: t('hero.estado.abreHoy', lang, { hora: '{hora}' }),
    abreManana: t('hero.estado.abreManana', lang, { hora: '{hora}' }),
  };
}
