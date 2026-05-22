import { getAccessToken, downloadSharedFile } from './graph';
import { parseInventoryXlsx } from './excel';
import { enrichRows, type InventoryItem, type NotFound } from './enrich';

interface Env {
  INVENTORY_KV: KVNamespace;
  AZURE_TENANT_ID: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  SHAREPOINT_SHARE_URL: string;
}

interface SnapshotMeta {
  updatedAt: string;
  itemsCount: number;
  notFoundCount: number;
  skippedMuerto: number;
  skippedInvalidCn: number;
  durationMs: number;
}

interface Snapshot {
  meta: SnapshotMeta;
  items: InventoryItem[];
  notFound: NotFound[];
}

const KV_KEY = 'inventory:current';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

async function runSync(env: Env): Promise<Snapshot> {
  if (!env.AZURE_TENANT_ID || !env.AZURE_CLIENT_ID || !env.AZURE_CLIENT_SECRET) {
    throw new Error('Missing Azure credentials in env');
  }
  if (!env.SHAREPOINT_SHARE_URL) {
    throw new Error('Missing SHAREPOINT_SHARE_URL in env');
  }
  const t0 = Date.now();
  const token = await getAccessToken({
    tenantId: env.AZURE_TENANT_ID,
    clientId: env.AZURE_CLIENT_ID,
    clientSecret: env.AZURE_CLIENT_SECRET,
  });
  const buf = await downloadSharedFile(env.SHAREPOINT_SHARE_URL, token);
  const parsed = parseInventoryXlsx(buf);
  const enriched = await enrichRows(parsed.rows);
  const snapshot: Snapshot = {
    meta: {
      updatedAt: new Date().toISOString(),
      itemsCount: enriched.items.length,
      notFoundCount: enriched.notFound.length,
      skippedMuerto: parsed.skippedMuerto,
      skippedInvalidCn: parsed.skippedInvalidCn,
      durationMs: Date.now() - t0,
    },
    items: enriched.items,
    notFound: enriched.notFound,
  };
  await env.INVENTORY_KV.put(KV_KEY, JSON.stringify(snapshot));
  return snapshot;
}

function publicShape(snapshot: Snapshot) {
  return {
    updatedAt: snapshot.meta.updatedAt,
    itemsCount: snapshot.meta.itemsCount,
    items: snapshot.items,
  };
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      runSync(env)
        .then((s) =>
          console.log(
            `sync ok: items=${s.meta.itemsCount} notFound=${s.meta.notFoundCount} muerto=${s.meta.skippedMuerto} invalidCn=${s.meta.skippedInvalidCn} duration=${s.meta.durationMs}ms`,
          ),
        )
        .catch((err) => console.error('sync failed:', err)),
    );
  },

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
        {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      );
    }

    if (url.pathname === '/__sync' && req.method === 'POST') {
      const auth = req.headers.get('Authorization') ?? '';
      const expected = `Bearer ${env.AZURE_CLIENT_SECRET}`;
      if (auth !== expected) {
        return new Response('Unauthorized', { status: 401, headers: CORS_HEADERS });
      }
      try {
        const snapshot = await runSync(env);
        return new Response(JSON.stringify({ status: 'ok', meta: snapshot.meta }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ status: 'error', message: (err as Error).message }),
          {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          },
        );
      }
    }

    return new Response(
      JSON.stringify({
        endpoints: {
          'GET /inventory': 'cached enriched stock list (public)',
          'GET /diagnostics': 'sync metadata + sample of CNs that did not match CIMA',
          'POST /__sync': 'manual trigger (Authorization: Bearer <AZURE_CLIENT_SECRET>)',
        },
      }),
      {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    );
  },
};
