import { crearTraductor } from '@larokifarm/i18n-utils';
import es from '../i18n/es.json';
import en from '../i18n/en.json';
import ca from '../i18n/ca.json';

export type Lang = 'es' | 'en' | 'ca';

const traductor = crearTraductor<Lang>({
  recursos: { es, en, ca },
  localesDisponibles: ['es', 'en', 'ca'] as const,
  localeDefecto: 'es',
});

export function t(key: string, lang: Lang = 'es', params?: Record<string, string | number>): string {
  return traductor.t(key, lang, params);
}

export const isLang = traductor.esLocaleValido;

export function resolveLang(value: unknown, fallback: Lang = 'es'): Lang {
  return isLang(value) ? value : fallback;
}
