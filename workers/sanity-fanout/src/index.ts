/**
 * Fan-out: recibe el webhook de Sanity y dispara los deploy hooks de CF Pages
 * configurados, en paralelo. Permite tener un único webhook en Sanity que
 * rebuildea N sitios (calendario standalone + cada landing de farmacia).
 */

interface Env {
  /** URLs de deploy hook separadas por coma. Ej.: "https://...torrents,https://...calendario". */
  DEPLOY_HOOKS: string;
  /** Secret compartido con Sanity para verificar la firma HMAC del webhook. */
  SANITY_WEBHOOK_SECRET: string;
}

const SIGNATURE_HEADER = 'sanity-webhook-signature';
const MAX_AGE_MS = 5 * 60 * 1000;

function base64urlEncode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifySanitySignature(
  header: string | null,
  body: string,
  secret: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (!header) return { ok: false, reason: 'missing signature header' };

  // Formato: "t=<timestamp-ms>,v1=<base64url-signature>"
  const parts: Record<string, string> = {};
  for (const segment of header.split(',')) {
    const [k, v] = segment.split('=', 2);
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts.t;
  const sig = parts.v1;
  if (!ts || !sig) return { ok: false, reason: 'malformed signature' };

  const timestamp = Number(ts);
  if (!Number.isFinite(timestamp)) return { ok: false, reason: 'invalid timestamp' };
  if (Math.abs(Date.now() - timestamp) > MAX_AGE_MS) {
    return { ok: false, reason: 'signature too old' };
  }

  const payload = `${ts}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const computed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  const expected = base64urlEncode(computed);

  return timingSafeEqual(expected, sig)
    ? { ok: true }
    : { ok: false, reason: 'signature mismatch' };
}

interface FanoutResult {
  hook: string;
  status: number | 'error';
  error?: string;
}

async function fanout(hooks: string[]): Promise<FanoutResult[]> {
  const results = await Promise.allSettled(
    hooks.map((url) => fetch(url, { method: 'POST' })),
  );
  return results.map((r, i) => {
    const hook = mask(hooks[i]);
    if (r.status === 'fulfilled') return { hook, status: r.value.status };
    return { hook, status: 'error', error: String(r.reason) };
  });
}

function mask(url: string): string {
  // Oculta el token, deja visible host + path corto para logs/debug.
  try {
    const u = new URL(url);
    const segs = u.pathname.split('/').filter(Boolean);
    const last = segs.at(-1) ?? '';
    const tail = last.length > 8 ? `${last.slice(0, 4)}…${last.slice(-4)}` : last;
    return `${u.host}/…/${tail}`;
  } catch {
    return url.slice(0, 40) + '…';
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'GET') {
      return new Response('larokifarm-sanity-fanout · POST a webhook here', {
        status: 200,
      });
    }
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!env.SANITY_WEBHOOK_SECRET || !env.DEPLOY_HOOKS) {
      return new Response('Worker not configured', { status: 500 });
    }

    const body = await req.text();
    const verify = await verifySanitySignature(
      req.headers.get(SIGNATURE_HEADER),
      body,
      env.SANITY_WEBHOOK_SECRET,
    );
    if (!verify.ok) {
      return new Response(`Unauthorized: ${verify.reason}`, { status: 401 });
    }

    const hooks = env.DEPLOY_HOOKS.split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (hooks.length === 0) {
      return new Response('No deploy hooks configured', { status: 500 });
    }

    const fanned = await fanout(hooks);
    const allOk = fanned.every(
      (r) => typeof r.status === 'number' && r.status >= 200 && r.status < 300,
    );

    return Response.json(
      {
        ok: allOk,
        triggered: fanned.length,
        results: fanned,
      },
      { status: allOk ? 200 : 502 },
    );
  },
} satisfies ExportedHandler<Env>;
