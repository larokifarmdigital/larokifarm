// Cookie HTTP-only firmada con HMAC-SHA256 (BATCH_COOKIE_SECRET).
// Password única compartida (BATCH_PASSWORD) · expiración 24h.

const COOKIE_NAME = 'scout_batch_auth';
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta env var: ${name}`);
  return v;
}

async function sign(payload: string): Promise<string> {
  const secret = requireEnv('BATCH_COOKIE_SECRET');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function generateCookieValue(): Promise<string> {
  const issuedAt = Date.now();
  const payload = `v1.${issuedAt}`;
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifyCookieValue(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  const [version, issuedAtRaw, sig] = parts;
  if (version !== 'v1') return false;
  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;

  const ageMs = Date.now() - issuedAt;
  if (ageMs < 0 || ageMs > COOKIE_MAX_AGE_SECONDS * 1000) return false;

  const expectedSig = await sign(`${version}.${issuedAtRaw}`);
  // Comparación timing-safe: nunca sale antes por diferencias de longitud/valor.
  if (expectedSig.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    diff |= expectedSig.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

export const BATCH_COOKIE = {
  name: COOKIE_NAME,
  maxAge: COOKIE_MAX_AGE_SECONDS,
} as const;
