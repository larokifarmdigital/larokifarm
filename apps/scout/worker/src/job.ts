/**
 * Persistencia del estado del batch en KV.
 *
 * Estructura:
 *   - job:{jobId}          → JobState (JSON)
 *   - result:{jobId}       → ArrayBuffer del Excel resultado (TTL 7 días)
 *   - lock:current         → jobId del batch actualmente en curso (semáforo)
 *
 * TTL del job y del resultado: 7 días. Después el cliente relanza el batch.
 */

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobState {
  jobId: string;
  status: JobStatus;
  processed: number;
  total: number;
  startedAt: string;      // ISO
  finishedAt?: string;    // ISO cuando completed/failed
  error?: string;         // texto de error si failed
  bytes?: number;         // tamaño del Excel resultado
  stats?: {
    skippedMuerto: number;
    skippedInvalidCn: number;
    skippedSinNombre: number;
  };
}

const JOB_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 días
const RESULT_TTL_SECONDS = 7 * 24 * 60 * 60;
const LOCK_TTL_SECONDS = 4 * 60 * 60; // 4h · si un batch se queda colgado, el lock caduca solo

const KEY = {
  job: (id: string) => `job:${id}`,
  result: (id: string) => `result:${id}`,
  lock: 'lock:current',
} as const;

export async function getJob(kv: KVNamespace, jobId: string): Promise<JobState | null> {
  return (await kv.get(KEY.job(jobId), 'json')) as JobState | null;
}

export async function saveJob(kv: KVNamespace, state: JobState): Promise<void> {
  await kv.put(KEY.job(state.jobId), JSON.stringify(state), {
    expirationTtl: JOB_TTL_SECONDS,
  });
}

export async function saveResult(
  kv: KVNamespace,
  jobId: string,
  buffer: ArrayBuffer,
): Promise<void> {
  await kv.put(KEY.result(jobId), buffer, { expirationTtl: RESULT_TTL_SECONDS });
}

export async function loadResult(
  kv: KVNamespace,
  jobId: string,
): Promise<ArrayBuffer | null> {
  return (await kv.get(KEY.result(jobId), 'arrayBuffer')) as ArrayBuffer | null;
}

// -------------------- Semáforo (evita batches simultáneos) --------------------

export async function acquireLock(kv: KVNamespace, jobId: string): Promise<boolean> {
  const current = await kv.get(KEY.lock);
  if (current) return false;
  await kv.put(KEY.lock, jobId, { expirationTtl: LOCK_TTL_SECONDS });
  return true;
}

export async function releaseLock(kv: KVNamespace, jobId: string): Promise<void> {
  const current = await kv.get(KEY.lock);
  if (current === jobId) {
    await kv.delete(KEY.lock);
  }
}

export async function getCurrentLockedJobId(kv: KVNamespace): Promise<string | null> {
  return await kv.get(KEY.lock);
}

// -------------------- Helper para generar jobIds --------------------

export function newJobId(): string {
  // 16 hex chars — suficientemente único para uso humano, corto para URLs.
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
