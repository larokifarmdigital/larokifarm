// NOTE: matching por descripción como red de seguridad cuando pedido y
// factura NO comparten ningún identificador fuerte (C.N., EAN o cód. interno).
// Caso típico: Zambon manda el pedido como PDF sólo con descripciones y la
// factura con cód. interno propio. Descripciones no coinciden literal
// ("ULTRA-LEVURA 250MG 20 CAPS" vs "ULTRA-LEVURA 250MG 20CPS -BL-") — el
// matching se hace sobre tokens normalizados + sinónimos farma.

const SYNONYMS: Record<string, string> = {
  // Cápsulas
  cps: 'cap',
  caps: 'cap',
  capsula: 'cap',
  capsulas: 'cap',
  capsul: 'cap',
  // Comprimidos
  cpr: 'comp',
  comp: 'comp',
  comprimido: 'comp',
  comprimidos: 'comp',
  compr: 'comp',
  // Sobres
  sobre: 'sob',
  sobres: 'sob',
  sobs: 'sob',
  // Gragea
  grg: 'grg',
  grageas: 'grg',
  gragea: 'grg',
  // Ampolla
  amp: 'amp',
  ampolla: 'amp',
  ampollas: 'amp',
  // Líquidos y semisólidos
  jarab: 'jarabe',
  jarabe: 'jarabe',
  jarabes: 'jarabe',
  susp: 'suspension',
  suspension: 'suspension',
  crm: 'crema',
  crema: 'crema',
  cremas: 'crema',
  pom: 'pomada',
  pomada: 'pomada',
  pomadas: 'pomada',
  gel: 'gel',
  geles: 'gel',
  spray: 'spray',
  sprays: 'spray',
  gotas: 'gotas',
  supo: 'supo',
  supos: 'supo',
  supositorio: 'supo',
  supositorios: 'supo',
  colirio: 'colirio',
  colirios: 'colirio',
  parche: 'parche',
  parches: 'parche',
  tira: 'tira',
  tiras: 'tira',
  inh: 'inhalador',
  inhalador: 'inhalador',
  inhaladores: 'inhalador',
};

// Tokens que identifican el FORMATO farmacéutico del producto (cápsulas,
// comprimidos, sobres, jarabe…). Dos SKUs de la misma marca+dosis pero
// distinto formato son productos diferentes: "20 CAPS" ≠ "20 SOB". Si
// ambas descripciones tienen algún token de formato y no coinciden,
// rechazamos el match aunque el overlap sea alto.
const FORMAT_TOKENS = new Set([
  'cap',
  'comp',
  'sob',
  'grg',
  'amp',
  'jarabe',
  'suspension',
  'crema',
  'pomada',
  'gel',
  'spray',
  'gotas',
  'supo',
  'colirio',
  'parche',
  'tira',
  'inhalador',
]);

// Divide "20CPS" → ["20", "CPS"], preservando dígitos + letras que suelen
// aparecer pegados en descripciones farma (200mg, 60ml, 40sob).
function splitAlphaNum(token: string): string[] {
  return token.split(/(?<=\d)(?=[a-z])|(?<=[a-z])(?=\d)/i);
}

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')       // acentos
    .replace(/[.,;:/()[\]-]/g, ' ')        // puntuación a espacio
    .split(/\s+/)
    .flatMap(splitAlphaNum)
    .filter((t) => t.length > 0);
}

export function normalizeDescriptionTokens(s: string): string[] {
  return tokenize(s).map((t) => SYNONYMS[t] ?? t);
}

export function descriptionSimilarity(a: string, b: string): number {
  const A = new Set(normalizeDescriptionTokens(a));
  const B = new Set(normalizeDescriptionTokens(b));
  if (A.size === 0 || B.size === 0) return 0;
  let intersection = 0;
  for (const t of A) if (B.has(t)) intersection += 1;
  // Overlap coefficient: intersection / min(|A|, |B|). Menos punitivo que
  // Jaccard con descripciones asimétricas (una tiene más metadata: "S/R",
  // "-BL-", "3,54MG/ML"). Combinado con el filtro numérico de abajo evita
  // falsos positivos por productos de la misma marca en presentaciones
  // distintas.
  return intersection / Math.min(A.size, B.size);
}

function numericTokens(tokens: string[]): Set<string> {
  return new Set(tokens.filter((t) => /^\d+$/.test(t)));
}

// Umbral por defecto: overlap ≥ 0.7 sobre tokens normalizados + dos
// safeguards para descartar falsos positivos:
//   1. Primer token (marca del medicamento) debe coincidir exacto.
//   2. Cualquier número presente en la descripción MÁS CORTA debe aparecer
//      también en la más larga (así "PARACETAMOL 500MG 20 COMP" nunca cruza
//      con "PARACETAMOL 500MG 30 COMP" — diferente SKU).
export const DEFAULT_DESCRIPTION_THRESHOLD = 0.7;

export function descriptionMatches(
  a: string,
  b: string,
  threshold = DEFAULT_DESCRIPTION_THRESHOLD,
): boolean {
  const rawA = tokenize(a);
  const rawB = tokenize(b);
  if (rawA.length === 0 || rawB.length === 0) return false;
  if (rawA[0] !== rawB[0]) return false;

  const numA = numericTokens(rawA);
  const numB = numericTokens(rawB);
  const [shorter, longer] = rawA.length <= rawB.length ? [numA, numB] : [numB, numA];
  for (const n of shorter) {
    if (!longer.has(n)) return false;
  }

  // Format safeguard: si ambas descripciones nombran formato farmacéutico
  // (cap/comp/sob/jarabe/…), tienen que ser el MISMO formato. Sino son SKUs
  // distintos aunque marca y dosis coincidan (caso Zambon: 20 CAPS vs 20 SOB
  // de ULTRA-LEVURA son productos diferentes).
  const normA = normalizeDescriptionTokens(a);
  const normB = normalizeDescriptionTokens(b);
  const fmtA = new Set(normA.filter((t) => FORMAT_TOKENS.has(t)));
  const fmtB = new Set(normB.filter((t) => FORMAT_TOKENS.has(t)));
  if (fmtA.size > 0 && fmtB.size > 0) {
    if (fmtA.size !== fmtB.size) return false;
    for (const f of fmtA) if (!fmtB.has(f)) return false;
  }

  return descriptionSimilarity(a, b) >= threshold;
}
