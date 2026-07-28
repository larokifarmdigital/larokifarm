interface InventoryItem {
  cn: string;
  nregistro: string;
  nombre: string;
  atcs: string[];
  principios: string[];
  labtitular?: string;
  receta?: boolean;
}

interface NotFound {
  cn: string;
  descripcion: string;
  reason: string;
}

interface SnapshotMeta {
  updatedAt: string;
  itemsCount: number;
  notFoundCount: number;
  skippedMuerto: number;
  skippedInvalidCn: number;
  totalDataRows?: number;
  durationMs: number;
}

interface Snapshot {
  meta: SnapshotMeta;
  items: InventoryItem[];
  notFound: NotFound[];
}

interface Env {
  INVENTORY_KV: KVNamespace;
}

const KV_KEY = 'inventory:current';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function publicShape(snapshot: Snapshot) {
  return {
    updatedAt: snapshot.meta.updatedAt,
    itemsCount: snapshot.meta.itemsCount,
    items: snapshot.items,
  };
}

export default {
  async fetch(req: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/inventory') {
      const raw = await env.INVENTORY_KV.get(KV_KEY);
      if (!raw) {
        return new Response(JSON.stringify({ items: [], updatedAt: null, itemsCount: 0 }), {
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
          },
        });
      }
      const snapshot = JSON.parse(raw) as Snapshot;
      return new Response(JSON.stringify(publicShape(snapshot)), {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    if (url.pathname === '/diagnostics') {
      const raw = await env.INVENTORY_KV.get(KV_KEY);
      if (!raw) {
        return new Response(JSON.stringify({ status: 'no-data' }), {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const snapshot = JSON.parse(raw) as Snapshot;
      return new Response(
        JSON.stringify({
          meta: snapshot.meta,
          notFoundSample: snapshot.notFound.slice(0, 50),
          notFoundTotal: snapshot.notFound.length,
        }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        endpoints: {
          'GET /inventory': 'cached enriched stock list (public)',
          'GET /diagnostics': 'sync metadata + sample of CNs that did not match CIMA',
        },
        note: 'Sync is performed by GitHub Actions (apps/inventory-sync). This worker only serves.',
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  },
};
