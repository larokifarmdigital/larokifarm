/**
 * scout-batch-worker · entrypoint.
 *
 * Flujo:
 *   1. Scout llama POST /run → creamos jobId, adquirimos semáforo, dispatch al Durable Object.
 *   2. El Durable Object corre en background (con alarm) todo el batch.
 *   3. Scout hace polling a GET /jobs/:id cada 2s.
 *   4. Al completed, Scout hace GET /jobs/:id/result y descarga el Excel.
 *
 * Auth: Bearer WORKER_AUTH_TOKEN en Authorization.
 * CORS: abierto (el token es la protección real).
 */

import { downloadSharedFile, getAccessToken } from './graph';
import { parseProductosXlsx, type ProductoRow } from './excel-in';
import { generarExcelResultado } from './excel-out';
import { compararProducto, type ProductoComparado } from './scraper';
import {
  acquireLock,
  getCurrentLockedJobId,
  getJob,
  loadResult,
  newJobId,
  releaseLock,
  saveJob,
  saveResult,
  type JobState,
} from './job';

export interface Env {
  SCOUT_JOBS_KV: KVNamespace;
  BATCH_JOB: DurableObjectNamespace;
  AZURE_TENANT_ID: string;
  AZURE_CLIENT_ID: string;
  AZURE_CLIENT_SECRET: string;
  SHAREPOINT_INPUT_URL: string;
  SCRAPERAPI_KEY: string;
  WORKER_AUTH_TOKEN: string;
  SKIP_MUERTO: string;
}

// ============================================================
// HTTP HANDLER
// ============================================================

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return corsResponse();

    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ ok: true, service: 'scout-batch-worker', ts: Date.now() });
    }

    if (!checkAuth(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401);

    if (url.pathname === '/run' && request.method === 'POST') {
      return handleRun(env, ctx);
    }

    const jobMatch = url.pathname.match(/^\/jobs\/([a-f0-9]{8,32})(\/result)?$/);
    if (jobMatch && request.method === 'GET') {
      const jobId = jobMatch[1];
      if (jobMatch[2] === '/result') return handleResult(env, jobId);
      return handleStatus(env, jobId);
    }

    return json({ ok: false, error: 'Not found' }, 404);
  },
};

// ============================================================
// Handlers
// ============================================================

async function handleRun(env: Env, ctx: ExecutionContext): Promise<Response> {
  // Semáforo · no permitir dos batches simultáneos.
  const jobId = newJobId();
  const gotLock = await acquireLock(env.SCOUT_JOBS_KV, jobId);
  if (!gotLock) {
    const currentId = await getCurrentLockedJobId(env.SCOUT_JOBS_KV);
    return json(
      {
        ok: false,
        error: 'Ya hay un batch en curso',
        currentJobId: currentId,
      },
      409,
    );
  }

  const now = new Date().toISOString();
  const initial: JobState = {
    jobId,
    status: 'pending',
    processed: 0,
    total: 0,
    startedAt: now,
  };
  await saveJob(env.SCOUT_JOBS_KV, initial);

  // Delegamos al Durable Object. Usamos idFromName(jobId) para que cada job
  // tenga su propia instancia y no colisione con otros.
  const doId = env.BATCH_JOB.idFromName(jobId);
  const stub = env.BATCH_JOB.get(doId);

  // Fire and forget — la ejecución del batch corre dentro del DO.
  // No esperamos su respuesta, respondemos inmediato al cliente.
  ctx.waitUntil(
    stub.fetch(new Request('https://internal/start', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
      headers: { 'Content-Type': 'application/json' },
    })).catch((err) => {
      console.error('DO dispatch error', err);
    }),
  );

  return json({ ok: true, jobId, status: 'pending', startedAt: now }, 202);
}

async function handleStatus(env: Env, jobId: string): Promise<Response> {
  const state = await getJob(env.SCOUT_JOBS_KV, jobId);
  if (!state) return json({ ok: false, error: 'Job no encontrado' }, 404);
  return json({ ok: true, ...state });
}

async function handleResult(env: Env, jobId: string): Promise<Response> {
  const state = await getJob(env.SCOUT_JOBS_KV, jobId);
  if (!state) return json({ ok: false, error: 'Job no encontrado' }, 404);
  if (state.status !== 'completed') {
    return json({ ok: false, error: `Job en estado ${state.status}` }, 409);
  }
  const buf = await loadResult(env.SCOUT_JOBS_KV, jobId);
  if (!buf) return json({ ok: false, error: 'Resultado expirado (TTL 7 días)' }, 410);

  const filename = `scout-batch-${state.startedAt.slice(0, 10)}.xlsx`;
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// ============================================================
// DURABLE OBJECT · procesamiento largo del batch
// ============================================================

export class BatchJob {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/start' && request.method === 'POST') {
      const { jobId } = (await request.json()) as { jobId: string };
      // No await · lo lanzamos y devolvemos, el DO sigue vivo hasta que termine
      // dentro del scope de blockConcurrencyWhile.
      this.state.blockConcurrencyWhile(async () => {
        await this.runBatch(jobId);
      });
      return new Response('started');
    }
    return new Response('not found', { status: 404 });
  }

  private async runBatch(jobId: string): Promise<void> {
    const kv = this.env.SCOUT_JOBS_KV;
    const state = await getJob(kv, jobId);
    if (!state) return;

    try {
      // 1. Auth Azure
      state.status = 'running';
      await saveJob(kv, state);
      const token = await getAccessToken({
        tenantId: this.env.AZURE_TENANT_ID,
        clientId: this.env.AZURE_CLIENT_ID,
        clientSecret: this.env.AZURE_CLIENT_SECRET,
      });

      // 2. Descargar Excel
      const buf = await downloadSharedFile(this.env.SHAREPOINT_INPUT_URL, token);

      // 3. Parsear
      const parsed = parseProductosXlsx(buf, {
        skipMuerto: this.env.SKIP_MUERTO !== 'false',
      });
      state.total = parsed.rows.length;
      state.stats = {
        skippedMuerto: parsed.skippedMuerto,
        skippedInvalidCn: parsed.skippedInvalidCn,
        skippedSinNombre: parsed.skippedSinNombre,
      };
      await saveJob(kv, state);

      // 4. Procesar productos (en paralelo por chunks pequeños)
      const productos: Array<{ input: ProductoRow; resultado: ProductoComparado }> = [];
      const CHUNK_SIZE = 4;      // 4 productos en paralelo
      const KV_WRITE_EVERY = 20; // guardar progreso cada 20 productos

      for (let i = 0; i < parsed.rows.length; i += CHUNK_SIZE) {
        const chunk = parsed.rows.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(
          chunk.map((row) =>
            compararProducto(row, {
              scraperApiKey: this.env.SCRAPERAPI_KEY,
            }).then((resultado) => ({ input: row, resultado })),
          ),
        );
        productos.push(...results);
        state.processed = productos.length;

        if (productos.length % KV_WRITE_EVERY === 0 || productos.length === parsed.rows.length) {
          await saveJob(kv, state);
        }
      }

      // 5. Generar Excel
      const excel = generarExcelResultado(productos, new Date());
      await saveResult(kv, jobId, excel.buffer);

      // 6. Marcar completado
      state.status = 'completed';
      state.finishedAt = new Date().toISOString();
      state.bytes = excel.bytes;
      await saveJob(kv, state);
    } catch (err) {
      state.status = 'failed';
      state.error = err instanceof Error ? err.message : String(err);
      state.finishedAt = new Date().toISOString();
      await saveJob(kv, state);
    } finally {
      await releaseLock(kv, jobId);
    }
  }
}

// ============================================================
// Utils
// ============================================================

function checkAuth(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization') ?? '';
  const expected = `Bearer ${env.WORKER_AUTH_TOKEN}`;
  return authHeader === expected && env.WORKER_AUTH_TOKEN.length > 0;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function corsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
