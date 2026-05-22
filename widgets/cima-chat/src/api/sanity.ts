import type { SymptomDef } from '../lib/symptoms';
import type { ProfileDef } from '../lib/profiles';

export interface CimaCatalog {
  symptoms: SymptomDef[];
  profiles: ProfileDef[];
  source: 'sanity' | 'bundled';
}

interface SanityConfig {
  projectId: string;
  dataset: string;
  apiVersion: string;
  ttlMs: number;
  cacheKey: string;
}

const DEFAULT: SanityConfig = {
  projectId: 'yovi040n',
  dataset: 'cima',
  apiVersion: '2024-01-01',
  ttlMs: 5 * 60 * 1000,
  cacheKey: 'cima-chat:catalog:v1',
};

interface SanityActivo { _id: string; nombre: string; nombreVisible: string }
interface SanityRef { _ref: string }
interface SanitySintoma {
  _id: string;
  id: string;
  label: string;
  emoji: string;
  orden?: number;
  activo?: boolean;
  activos?: SanityRef[];
}
interface SanityPerfil {
  _id: string;
  id: string;
  label: string;
  emoji: string;
  orden?: number;
  activo?: boolean;
  safe?: SanityRef[];
  warning?: string;
}

const QUERY = encodeURIComponent(
  `{
    "activos": *[_type == "principioActivo"]{ _id, nombre, nombreVisible },
    "sintomas": *[_type == "sintoma" && activo == true] | order(orden asc){ _id, id, label, emoji, orden, activos[]{ _ref } },
    "perfiles": *[_type == "perfil" && activo == true] | order(orden asc){ _id, id, label, emoji, orden, safe[]{ _ref }, warning }
  }`,
);

function buildUrl(cfg: SanityConfig): string {
  return `https://${cfg.projectId}.apicdn.sanity.io/v${cfg.apiVersion}/data/query/${cfg.dataset}?query=${QUERY}`;
}

function tryReadCache(cfg: SanityConfig): CimaCatalog | null {
  try {
    const raw = localStorage.getItem(cfg.cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: CimaCatalog };
    if (Date.now() - parsed.ts > cfg.ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(cfg: SanityConfig, data: CimaCatalog) {
  try {
    localStorage.setItem(cfg.cacheKey, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // localStorage full or disabled — ignore
  }
}

function mapResult(json: {
  result: { activos: SanityActivo[]; sintomas: SanitySintoma[]; perfiles: SanityPerfil[] };
}): CimaCatalog {
  const activos = json.result.activos;
  const slugByRef = new Map<string, string>();
  activos.forEach((a) => slugByRef.set(a._id, a.nombre));

  const symptoms: SymptomDef[] = json.result.sintomas.map((s) => ({
    id: s.id,
    label: s.label,
    emoji: s.emoji,
    activos: (s.activos ?? []).map((r) => slugByRef.get(r._ref)).filter((x): x is string => !!x),
  }));

  const profiles: ProfileDef[] = json.result.perfiles.map((p) => ({
    id: p.id,
    label: p.label,
    emoji: p.emoji,
    safe: new Set((p.safe ?? []).map((r) => slugByRef.get(r._ref)).filter((x): x is string => !!x)),
    warning: p.warning,
  }));

  return { symptoms, profiles, source: 'sanity' };
}

export async function fetchCatalog(
  fallback: CimaCatalog,
  cfgOverride: Partial<SanityConfig> = {},
): Promise<CimaCatalog> {
  const cfg = { ...DEFAULT, ...cfgOverride };
  const cached = tryReadCache(cfg);
  if (cached) return cached;

  try {
    const res = await fetch(buildUrl(cfg));
    if (!res.ok) throw new Error(`Sanity ${res.status}`);
    const json = await res.json();
    if (!json.result?.sintomas?.length) throw new Error('empty result');
    const catalog = mapResult(json);
    writeCache(cfg, catalog);
    return catalog;
  } catch {
    return fallback;
  }
}
