/**
 * Token firmado HMAC para URLs de descarga.
 *
 * Compartido por todos los adapters de `StorageRepository`. El endpoint
 * `/api/files/[...key]` verifica el token con `verifyDownloadToken` sin saber
 * qué adapter (local, R2, …) emitió la URL — el contrato es uniforme.
 *
 * Formato: `base64url(payload).hmac(payload)`
 *   payload = { k: key, f: filename, e: expiryUnix, n: nonce }
 */
import { createHmac, randomUUID } from 'node:crypto';

interface DownloadTokenPayload {
  k: string;
  f: string;
  e: number;
  n: string;
}

function getSigningSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET requerido para firmar URLs.');
  return secret;
}

function b64urlEncode(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(s: string): Buffer {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Buffer.from(
    s.replace(/-/g, '+').replace(/_/g, '/') + pad,
    'base64',
  );
}

function signPayload(payloadB64: string): string {
  return b64urlEncode(
    createHmac('sha256', getSigningSecret()).update(payloadB64).digest(),
  );
}

export function signDownloadToken(
  key: string,
  filename: string,
  expiresInSec: number,
): string {
  const payload: DownloadTokenPayload = {
    k: key,
    f: filename,
    e: Math.floor(Date.now() / 1000) + expiresInSec,
    n: randomUUID(),
  };
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(payload)));
  return `${payloadB64}.${signPayload(payloadB64)}`;
}

export function verifyDownloadToken(
  token: string,
  expectedKey: string,
):
  | { ok: false; reason: string }
  | { ok: true; filename: string } {
  const parts = token.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'token mal formado' };
  const [payloadB64, sig] = parts;

  const expected = signPayload(payloadB64);
  if (sig !== expected) return { ok: false, reason: 'firma inválida' };

  let payload: DownloadTokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64).toString('utf8'));
  } catch {
    return { ok: false, reason: 'payload ilegible' };
  }

  if (payload.e < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: 'token expirado' };
  }
  if (payload.k !== expectedKey) {
    return { ok: false, reason: 'key no coincide' };
  }
  return { ok: true, filename: payload.f };
}
