// Cliente HTTP contra scout-batch-worker.
// WARN: uso exclusivamente server-side · el Bearer token no debe exponerse al browser.

export interface JobState {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
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

export interface PreviewData {
  totalDataRows: number;
  totalConsiderados: number;
  skippedMuerto: number;
  skippedInvalidCn: number;
  skippedSinNombre: number;
  headersDetectados: string[];
  primeros: Array<{ cn: string; ean: string; nombre: string; clasificacion: string }>;
  mockMode: boolean;
}

export interface HealthData {
  ok: boolean;
  service: string;
  ts: number;
  mockMode: boolean;
}

export interface BatchWorkerConfig {
  baseUrl: string;
  authToken: string;
}

export class BatchWorkerError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = 'BatchWorkerError';
  }
}

export class BatchWorkerClient {
  constructor(private readonly cfg: BatchWorkerConfig) {}

  /** Público (sin auth). Devuelve mockMode. */
  async getHealth(): Promise<HealthData> {
    const res = await fetch(`${this.cfg.baseUrl}/health`, { cache: 'no-store' });
    if (!res.ok) throw new BatchWorkerError(`HTTP ${res.status}`, res.status);
    return (await res.json()) as HealthData;
  }

  /** Stats del Excel sin correr batch (0 créditos consumidos). */
  async preview(): Promise<PreviewData> {
    const res = await this.fetch('/preview');
    const payload = (await res.json()) as
      | ({ ok: true } & PreviewData)
      | { ok: false; error: string };
    if (!res.ok || !payload.ok) {
      const msg = 'error' in payload ? payload.error : `HTTP ${res.status}`;
      throw new BatchWorkerError(msg, res.status, payload);
    }
    return payload;
  }

  /** Últimos batches ejecutados. */
  async listRecentJobs(): Promise<JobState[]> {
    const res = await this.fetch('/jobs');
    const payload = (await res.json()) as { ok: boolean; jobs?: JobState[]; error?: string };
    if (!res.ok || !payload.ok || !payload.jobs) {
      throw new BatchWorkerError(payload.error ?? `HTTP ${res.status}`, res.status);
    }
    return payload.jobs;
  }

  /** Lanza un batch nuevo. Devuelve el jobId. */
  async run(): Promise<{ jobId: string; startedAt: string }> {
    const res = await this.fetch('/run', { method: 'POST' });
    const payload = (await res.json()) as
      | { ok: true; jobId: string; startedAt: string }
      | { ok: false; error: string; currentJobId?: string };

    if (!res.ok || !payload.ok) {
      const msg = 'error' in payload ? payload.error : `HTTP ${res.status}`;
      throw new BatchWorkerError(msg, res.status, payload);
    }
    return { jobId: payload.jobId, startedAt: payload.startedAt };
  }

  /** Consulta el estado del job. */
  async getStatus(jobId: string): Promise<JobState> {
    const res = await this.fetch(`/jobs/${encodeURIComponent(jobId)}`);
    const payload = (await res.json()) as { ok: boolean; error?: string } & JobState;
    if (!res.ok || !payload.ok) {
      throw new BatchWorkerError(
        payload.error ?? `HTTP ${res.status}`,
        res.status,
        payload,
      );
    }
    return payload;
  }

  /** URL absoluta del endpoint de descarga. NOTE: no incluye Bearer token. */
  buildDownloadUrl(jobId: string): string {
    return `${this.cfg.baseUrl}/jobs/${encodeURIComponent(jobId)}/result`;
  }

  async downloadResult(jobId: string): Promise<ArrayBuffer> {
    const res = await this.fetch(`/jobs/${encodeURIComponent(jobId)}/result`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BatchWorkerError(
        `Descarga fallida: ${text || res.statusText}`,
        res.status,
      );
    }
    return res.arrayBuffer();
  }

  private async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = `${this.cfg.baseUrl}${path}`;
    return fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${this.cfg.authToken}`,
      },
      cache: 'no-store',
    });
  }
}

// Auto-añade `https://` si BATCH_WORKER_URL viene sin protocolo.
export function batchWorkerFromEnv(): BatchWorkerClient {
  const rawUrl = process.env.BATCH_WORKER_URL;
  const authToken = process.env.WORKER_AUTH_TOKEN;
  if (!rawUrl || !authToken) {
    throw new Error(
      'Faltan variables de entorno: BATCH_WORKER_URL y/o WORKER_AUTH_TOKEN.',
    );
  }
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  const baseUrl = withProtocol.replace(/\/$/, '');
  return new BatchWorkerClient({ baseUrl, authToken });
}
