/**
 * Cifrado simétrico AES-256-GCM para secretos sensibles guardados en BD.
 *
 * Uso principal (Fase 2 / Fase 4): cifrar la `gemini_api_key` por negocio antes
 * de persistirla en `Business.geminiKeyEnc`.
 *
 * Formato del ciphertext almacenado en BD (string base64):
 *   [12 bytes IV][N bytes ciphertext+authTag]
 *
 * La master key viene de `ENCRYPTION_KEY` (32 bytes base64). Si se rota, todos
 * los `geminiKeyEnc` quedan ilegibles — habría que reencriptarlos.
 */
import { webcrypto } from 'node:crypto';

const ALGO = 'AES-GCM';
const IV_BYTES = 12;

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('ENCRYPTION_KEY no está configurada en el entorno.');
  }
  const rawBytes = Buffer.from(raw, 'base64');
  if (rawBytes.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY debe ser 32 bytes en base64 (recibidos ${rawBytes.length}).`,
    );
  }

  cachedKey = await webcrypto.subtle.importKey(
    'raw',
    rawBytes,
    { name: ALGO },
    false,
    ['encrypt', 'decrypt'],
  );
  return cachedKey;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = webcrypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(plaintext);

  const ciphertext = await webcrypto.subtle.encrypt({ name: ALGO, iv }, key, data);

  const combined = new Uint8Array(IV_BYTES + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), IV_BYTES);
  return Buffer.from(combined).toString('base64');
}

export async function decrypt(ciphertextB64: string): Promise<string> {
  const key = await getKey();
  const combined = Buffer.from(ciphertextB64, 'base64');
  const iv = combined.subarray(0, IV_BYTES);
  const data = combined.subarray(IV_BYTES);

  const plaintext = await webcrypto.subtle.decrypt({ name: ALGO, iv }, key, data);
  return new TextDecoder().decode(plaintext);
}
