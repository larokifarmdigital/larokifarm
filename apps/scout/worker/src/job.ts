// Persistencia en KV. Keys: job:{id}, result:{id} (TTL 7d), lock:current.

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobState {
  jobId: string;
  status: JobStatus;
  processed: number;
  total: number;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  bytes?: number;
  stats?: {
    skippedMuerto: number;
    skippedInvalidCn: number;
    skippedSinNombre: number;
  };
}

const JOB_TTL_SECONDS = 7 * 24 * 60 * 60;
const RESULT_TTL_SECONDS = 7 * 24 * 60 * 60;
// NOTE: el lock caduca solo a las 4h si un batch se cuelga.
const LOCK_TTL_SECONDS = 4 * 60 * 60;

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

// Semáforo · evita batches simultáneos.

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

// 16 hex chars — único a efectos prácticos, corto para URLs.
export function newJobId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// KV.list() no ordena por fecha; leemos y ordenamos por startedAt del propio JobState.
export async function listRecentJobs(
  kv: KVNamespace,
  limit = 5,
): Promise<JobState[]> {
  const list = await kv.list({ prefix: 'job:', limit: 50 });
  const jobs: JobState[] = [];
  for (const key of list.keys) {
    const state = (await kv.get(key.name, 'json')) as JobState | null;
    if (state) jobs.push(state);
  }
  jobs.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return jobs.slice(0, limit);
}
