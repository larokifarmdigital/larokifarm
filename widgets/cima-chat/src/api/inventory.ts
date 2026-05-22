export interface InventoryItem {
  cn: string;
  nregistro: string;
  nombre: string;
  atcs: string[];
  principios: string[];
  labtitular?: string;
  receta?: boolean;
}

export interface Inventory {
  raw: InventoryItem[];
  byNregistro: Map<string, InventoryItem>;
  byAtc: Map<string, InventoryItem[]>;
  byPrincipio: Map<string, InventoryItem[]>;
  source: 'remote' | 'mock' | 'empty';
}

interface InventoryConfig {
  url?: string;
  cacheKey: string;
  ttlMs: number;
  useMock: boolean;
}

const DEFAULT: InventoryConfig = {
  url: (import.meta as any).env?.VITE_INVENTORY_URL,
  cacheKey: 'cima-chat:inventory:v1',
  ttlMs: 30 * 60 * 1000,
  useMock: !(import.meta as any).env?.VITE_INVENTORY_URL,
};

const MOCK_INVENTORY: InventoryItem[] = [
  {
    cn: '654415',
    nregistro: '65726',
    nombre: 'IBUPROFENO CINFA 400 mg COMPRIMIDOS RECUBIERTOS CON PELÍCULA EFG',
    atcs: ['M01AE01', 'M01AE', 'M01A', 'M01', 'M'],
    principios: ['ibuprofeno'],
    labtitular: 'LABORATORIOS CINFA, S.A.',
    receta: false,
  },
  {
    cn: '659019',
    nregistro: '70030',
    nombre: 'PARACETAMOL CINFA 1 g COMPRIMIDOS RECUBIERTOS CON PELÍCULA EFG',
    atcs: ['N02BE01', 'N02BE', 'N02B', 'N02', 'N'],
    principios: ['paracetamol'],
    labtitular: 'LABORATORIOS CINFA, S.A.',
    receta: true,
  },
  {
    cn: '688390',
    nregistro: '66662',
    nombre: 'OMEPRAZOL CINFA 20 mg CAPSULAS DURAS GASTRORRESISTENTES EFG',
    atcs: ['A02BC01', 'A02BC', 'A02B', 'A02', 'A'],
    principios: ['omeprazol'],
    labtitular: 'LABORATORIOS CINFA, S.A.',
    receta: false,
  },
  {
    cn: '698461',
    nregistro: '69925',
    nombre: 'LORATADINA CINFA 10 mg COMPRIMIDOS EFG',
    atcs: ['R06AX13', 'R06AX', 'R06A', 'R06', 'R'],
    principios: ['loratadina'],
    labtitular: 'LABORATORIOS CINFA, S.A.',
    receta: false,
  },
];

function emptyInventory(source: Inventory['source'] = 'empty'): Inventory {
  return {
    raw: [],
    byNregistro: new Map(),
    byAtc: new Map(),
    byPrincipio: new Map(),
    source,
  };
}

function indexInventory(items: InventoryItem[], source: Inventory['source']): Inventory {
  const byNregistro = new Map<string, InventoryItem>();
  const byAtc = new Map<string, InventoryItem[]>();
  const byPrincipio = new Map<string, InventoryItem[]>();
  for (const it of items) {
    if (!it.nregistro) continue;
    byNregistro.set(it.nregistro, it);
    for (const atc of it.atcs ?? []) {
      const list = byAtc.get(atc) ?? [];
      list.push(it);
      byAtc.set(atc, list);
    }
    for (const p of it.principios ?? []) {
      const key = p.toLowerCase();
      const list = byPrincipio.get(key) ?? [];
      list.push(it);
      byPrincipio.set(key, list);
    }
  }
  return { raw: items, byNregistro, byAtc, byPrincipio, source };
}

function tryReadCache(cfg: InventoryConfig): InventoryItem[] | null {
  try {
    const raw = localStorage.getItem(cfg.cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: InventoryItem[] };
    if (Date.now() - parsed.ts > cfg.ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(cfg: InventoryConfig, data: InventoryItem[]) {
  try {
    localStorage.setItem(cfg.cacheKey, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore
  }
}

export async function fetchInventory(
  cfgOverride: Partial<InventoryConfig> = {},
): Promise<Inventory> {
  const cfg = { ...DEFAULT, ...cfgOverride };

  if (cfg.useMock) {
    return indexInventory(MOCK_INVENTORY, 'mock');
  }

  if (!cfg.url) return emptyInventory();

  const cached = tryReadCache(cfg);
  if (cached) return indexInventory(cached, 'remote');

  try {
    const res = await fetch(cfg.url);
    if (!res.ok) throw new Error(`Inventory ${res.status}`);
    const json = (await res.json()) as { items?: InventoryItem[] };
    const items = Array.isArray(json.items) ? json.items : [];
    writeCache(cfg, items);
    return indexInventory(items, 'remote');
  } catch {
    return emptyInventory();
  }
}
