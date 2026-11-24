import 'server-only';

export type PruebaClaveGemini = { ok: true } | { ok: false; motivo: 'invalida' | 'sin-respuesta' };

/**
 * Comprueba con Google que una clave de Gemini funciona antes de guardarla.
 * Listar modelos no gasta tokens: no cuesta nada.
 */
export async function probarClaveGemini(clave: string): Promise<PruebaClaveGemini> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1', {
      headers: { 'x-goog-api-key': clave },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) return { ok: true };
    if (res.status === 400 || res.status === 401 || res.status === 403) return { ok: false, motivo: 'invalida' };
    return { ok: false, motivo: 'sin-respuesta' };
  } catch {
    return { ok: false, motivo: 'sin-respuesta' };
  }
}
