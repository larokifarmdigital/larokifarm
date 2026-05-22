import es from '../i18n/es.json';
import en from '../i18n/en.json';
import ca from '../i18n/ca.json';

export type Lang = 'es' | 'en' | 'ca';

const dicts: Record<Lang, Record<string, string>> = { es, en, ca };

export function t(key: string, lang: Lang = 'es', params?: Record<string, string | number>): string {
  const dict = dicts[lang] ?? dicts.es;
  let value = dict[key] ?? dicts.es[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return value;
}

export function isLang(value: unknown): value is Lang {
  return value === 'es' || value === 'en' || value === 'ca';
}

export function resolveLang(value: unknown, fallback: Lang = 'es'): Lang {
  return isLang(value) ? value : fallback;
}
