import type {
  CimaMedicamento,
  CimaMedicamentoListItem,
} from '../api/types';

export type ProfileId =
  | 'bebe'
  | 'nino'
  | 'adolescente'
  | 'adulto'
  | 'embarazada'
  | 'lactancia'
  | 'mayor';

export interface SafetyVerdict {
  ok: boolean;
  reason?: string;
}

const FORM_WHITELIST: Partial<Record<ProfileId, RegExp>> = {
  bebe: /(suspensi[oó]n oral|jarabe|soluci[oó]n oral|gotas orales|supositori|polvo para suspensi[oó]n|polvo para soluci[oó]n|granulado para suspensi[oó]n)/i,
  nino: /(suspensi[oó]n oral|jarabe|soluci[oó]n oral|gotas orales|supositori|granulado|sobre|sachet|comprimid[oa] bucodispersable|comprimid[oa] masticable|polvo para)/i,
};

const ADULT_STRENGTH_RE = /\b(600 ?mg|800 ?mg|1\s?g\b|1000 ?mg)\b|\bRAPID\b|\bRETARD\b|\bFORTE\b|\bMIGRA\b|\bFLAS\b/i;

const COMBINATION_OK: Set<ProfileId> = new Set([
  'adolescente',
  'adulto',
  'embarazada',
  'lactancia',
  'mayor',
]);

const PROFILE_MAX_AGE_MONTHS: Partial<Record<ProfileId, number>> = {
  bebe: 23,
  nino: 131,
};

export function isPediatric(profileId: string): boolean {
  return profileId === 'bebe' || profileId === 'nino';
}

export function passesFormFilter(item: CimaMedicamentoListItem, profileId: string): boolean {
  const rule = FORM_WHITELIST[profileId as ProfileId];
  if (!rule) return true;
  const form = item.formaFarmaceutica?.nombre || '';
  return rule.test(form);
}

export function passesNameFilter(item: CimaMedicamentoListItem, profileId: string): boolean {
  if (!isPediatric(profileId)) return true;
  return !ADULT_STRENGTH_RE.test(item.nombre);
}

export function passesCombinationFilter(
  item: CimaMedicamentoListItem | CimaMedicamento,
  profileId: string,
): boolean {
  if (COMBINATION_OK.has(profileId as ProfileId)) return true;
  const detail = item as CimaMedicamento;
  if (Array.isArray(detail.principiosActivos)) {
    return detail.principiosActivos.length === 1;
  }
  const pactivos = detail.pactivos;
  if (!pactivos) return true;
  return !pactivos.includes(',');
}

export function applyLocalFilters(
  items: CimaMedicamentoListItem[],
  profileId: string,
): CimaMedicamentoListItem[] {
  return items.filter(
    (i) =>
      passesFormFilter(i, profileId) &&
      passesNameFilter(i, profileId) &&
      passesCombinationFilter(i, profileId),
  );
}

function weightKgToAgeMonths(kg: number): number {
  if (kg <= 4) return 0;
  if (kg <= 7) return 6;
  if (kg <= 10) return 12;
  if (kg <= 12) return 24;
  if (kg <= 16) return 48;
  if (kg <= 20) return 84;
  if (kg <= 25) return 96;
  if (kg <= 30) return 108;
  if (kg <= 40) return 144;
  return 180;
}

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(',', '.'));
}

const RE_MONTHS_FROM = /\ba\s+partir\s+de\s+(?:los\s+)?(\d+)\s+meses?\b/gi;
const RE_YEARS_FROM = /\b(?:a\s+partir\s+de(?:\s+los)?|mayores?\s+de)\s+(\d+)\s+a[ñn]os\b/gi;
const RE_NINOS_DE_X_MESES = /\bni[ñn]os?\s+de\s+(\d+)\s+meses?\b(?!\s*a\b)/gi;
const RE_WEIGHT_FROM = /\b(?:peso\s+(?:corporal\s+)?(?:superior|igual\s+o\s+superior|de\s+m[aá]s)\s+a|a\s+partir\s+de(?:\s+los)?)\s+(\d+(?:[,.]\d+)?)\s*kg\b/gi;
const RE_INFANT_KW = /(neonat|reci[eé]n nacid)/i;
const RE_LACTANTE_KW = /\blactant(?:e|es)\b/i;
const RE_BEBE_KW = /\bbeb[eé]s?\b/i;

const RE_RANGE_MESES = /\b(?:de\s+|entre\s+)(\d+)\s+(?:a|y)\s+\d+\s+meses?\b/gi;
const RE_RANGE_ANOS = /\b(?:de\s+|entre\s+)(\d+)\s+(?:a|y)\s+\d+\s+a[ñn]os\b/gi;
const RE_RANGE_KG_ENTRE = /\bentre\s+(\d+(?:[,.]\d+)?)\s+y\s+\d+(?:[,.]\d+)?\s*kg\b/gi;
const RE_RANGE_KG_A = /\b(\d+(?:[,.]\d+)?)\s*kg\s+a\s+\d+(?:[,.]\d+)?\s*kg\b/gi;

const RE_CONTRA_YEARS = /contraindicad[oa][^.]*?\bni[ñn]os?\s+(?:menores?\s+de\s+)?(\d+)\s+a[ñn]os\b/gi;
const RE_CONTRA_MONTHS = /contraindicad[oa][^.]*?\bni[ñn]os?\s+(?:menores?\s+de\s+)?(\d+)\s+meses?\b/gi;
const RE_CONTRA_LACTANTES = /contraindicad[oa][^.]*?\blactant/i;
const RE_CONTRA_GENERIC = /\bno\s+(?:se\s+(?:debe|recomienda)\s+)?(?:administrar|utilizar|usar|dar)\s+en\s+(?:beb[eé]s|lactantes|neonatos|reci[eé]n nacidos)/i;
const RE_NO_USAR_AÑOS = /\bno\s+(?:se\s+(?:debe|recomienda)\s+)?(?:administrar|utilizar|usar|dar)\b[^.]{0,80}?\bmenores\s+de\s+(\d+)\s+a[ñn]os\b/gi;
const RE_NO_USAR_MESES = /\bno\s+(?:se\s+(?:debe|recomienda)\s+)?(?:administrar|utilizar|usar|dar)\b[^.]{0,80}?\bmenores\s+de\s+(\d+)\s+meses?\b/gi;
const RE_PESO_INF = /\bpeso\s+inferior\s+a\s+(\d+(?:[,.]\d+)?)\s*kg\b/gi;

interface AgeWindow {
  positives: number[];
  contras: number[];
}

function collectAgeWindow(text: string): AgeWindow {
  const positives: number[] = [];
  const contras: number[] = [];

  if (RE_INFANT_KW.test(text)) positives.push(0);
  if (RE_LACTANTE_KW.test(text) && !RE_CONTRA_LACTANTES.test(text)) positives.push(1);
  if (RE_BEBE_KW.test(text)) positives.push(0);

  for (const m of text.matchAll(RE_MONTHS_FROM)) positives.push(parseInt(m[1], 10));
  for (const m of text.matchAll(RE_YEARS_FROM)) positives.push(parseInt(m[1], 10) * 12);
  for (const m of text.matchAll(RE_NINOS_DE_X_MESES)) positives.push(parseInt(m[1], 10));
  for (const m of text.matchAll(RE_WEIGHT_FROM)) positives.push(weightKgToAgeMonths(parseNumber(m[1])));
  for (const m of text.matchAll(RE_RANGE_MESES)) positives.push(parseInt(m[1], 10));
  for (const m of text.matchAll(RE_RANGE_ANOS)) positives.push(parseInt(m[1], 10) * 12);
  for (const m of text.matchAll(RE_RANGE_KG_ENTRE)) positives.push(weightKgToAgeMonths(parseNumber(m[1])));
  for (const m of text.matchAll(RE_RANGE_KG_A)) positives.push(weightKgToAgeMonths(parseNumber(m[1])));

  for (const m of text.matchAll(RE_CONTRA_YEARS)) contras.push(parseInt(m[1], 10) * 12);
  for (const m of text.matchAll(RE_CONTRA_MONTHS)) contras.push(parseInt(m[1], 10));
  for (const m of text.matchAll(RE_NO_USAR_AÑOS)) contras.push(parseInt(m[1], 10) * 12);
  for (const m of text.matchAll(RE_NO_USAR_MESES)) contras.push(parseInt(m[1], 10));
  for (const m of text.matchAll(RE_PESO_INF)) contras.push(weightKgToAgeMonths(parseNumber(m[1])));
  if (RE_CONTRA_LACTANTES.test(text)) contras.push(12);
  if (RE_CONTRA_GENERIC.test(text)) contras.push(24);

  return { positives, contras };
}

export function effectiveMinAgeMonths(text: string): number | null {
  const { positives, contras } = collectAgeWindow(text);
  if (positives.length === 0 && contras.length === 0) return null;
  const posMin = positives.length ? Math.min(...positives) : 0;
  const contraMax = contras.length ? Math.max(...contras) : 0;
  return Math.max(posMin, contraMax);
}

export function passesAgeCheck(text: string, profileId: string): boolean {
  const max = PROFILE_MAX_AGE_MONTHS[profileId as ProfileId];
  if (max == null) return true;
  const min = effectiveMinAgeMonths(text);
  if (min == null) return false;
  return min <= max;
}

export function verdictByFT(
  detail: CimaMedicamento | null,
  ft41: string,
  ft42: string,
  ft43: string,
  profileId: string,
): SafetyVerdict {
  if (detail && !passesCombinationFilter(detail, profileId)) {
    return { ok: false, reason: 'combinación de principios activos' };
  }
  if (RE_CONTRA_GENERIC.test(ft43)) {
    return { ok: false, reason: 'contraindicado en este perfil' };
  }
  const combined = `${ft41}\n\n${ft42}\n\n${ft43}`;
  if (!passesAgeCheck(combined, profileId)) {
    return { ok: false, reason: 'la ficha técnica no documenta uso para este perfil' };
  }
  return { ok: true };
}
