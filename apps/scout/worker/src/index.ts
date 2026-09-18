// scout-batch-worker · entrypoint.
// Auth: Bearer WORKER_AUTH_TOKEN. CORS abierto (el token es la protección real).

import { downloadSharedFile, getAccessToken } from './graph';
import { parseProductosXlsx, type ProductoRow } from './excel-in';
import { generarExcelResultado } from './excel-out';
import { compararProducto, type ProductoComparado } from './scraper';
import {
  acquireLock,
  getCurrentLockedJobId,
  getJob,
  listRecentJobs,
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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return corsResponse();

    if (url.pathname === '/health' && request.method === 'GET') {
      return json({
        ok: true,
        service: 'scout-batch-worker',
        ts: Date.now(),
        mockMode: isMockMode(env),
      });
    }

    if (!checkAuth(request, env)) return json({ ok: false, error: 'Unauthorized' }, 401);

    if (url.pathname === '/run' && request.method === 'POST') {
      return handleRun(env, ctx);
    }

    if (url.pathname === '/preview' && request.method === 'GET') {
      return handlePreview(env);
    }

    if (url.pathname === '/jobs' && request.method === 'GET') {
      return handleListJobs(env);
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

function isMockMode(env: Env): boolean {
  const key = env.SCRAPERAPI_KEY?.trim() ?? '';
  return key === '' || key.toUpperCase() === 'MOCK';
}

async function handleRun(env: Env, ctx: ExecutionContext): Promise<Response> {
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

  // Una instancia de Durable Object por jobId · aísla la ejecución.
  const doId = env.BATCH_JOB.idFromName(jobId);
  const stub = env.BATCH_JOB.get(doId);

  // Fire-and-forget: el batch corre dentro del DO, respondemos inmediato.
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

async function handleListJobs(env: Env): Promise<Response> {
  const jobs = await listRecentJobs(env.SCOUT_JOBS_KV, 5);
  return json({ ok: true, jobs });
}

// Stats del Excel + primeros N productos, sin lanzar batch (0 créditos).
async function handlePreview(env: Env): Promise<Response> {
  try {
    const token = await getAccessToken({
      tenantId: env.AZURE_TENANT_ID,
      clientId: env.AZURE_CLIENT_ID,
      clientSecret: env.AZURE_CLIENT_SECRET,
    });
    const buf = await downloadSharedFile(env.SHAREPOINT_INPUT_URL, token);
    const parsed = parseProductosXlsx(buf, {
      skipMuerto: env.SKIP_MUERTO !== 'false',
    });
    return json({
      ok: true,
      totalDataRows: parsed.totalDataRows,
      totalConsiderados: parsed.rows.length,
      skippedMuerto: parsed.skippedMuerto,
      skippedInvalidCn: parsed.skippedInvalidCn,
      skippedSinNombre: parsed.skippedSinNombre,
      headersDetectados: parsed.headersDetectados,
      primeros: parsed.rows.slice(0, 5),
      mockMode: isMockMode(env),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: msg }, 500);
  }
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

// Durable Object · procesamiento largo del batch.
export class BatchJob {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/start' && request.method === 'POST') {
      const { jobId } = (await request.json()) as { jobId: string };
      // blockConcurrencyWhile mantiene el DO vivo hasta que runBatch termine.
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
      state.status = 'running';
      await saveJob(kv, state);

      const token = await getAccessToken({
        tenantId: this.env.AZURE_TENANT_ID,
        clientId: this.env.AZURE_CLIENT_ID,
        clientSecret: this.env.AZURE_CLIENT_SECRET,
      });
      const buf = await downloadSharedFile(this.env.SHAREPOINT_INPUT_URL, token);
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

      // Chunks pequeños en paralelo · escritura de progreso cada 20 items.
      const productos: Array<{ input: ProductoRow; resultado: ProductoComparado }> = [];
      const CHUNK_SIZE = 4;
      const KV_WRITE_EVERY = 20;

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

      const excel = generarExcelResultado(productos, new Date());
      await saveResult(kv, jobId, excel.buffer);

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
