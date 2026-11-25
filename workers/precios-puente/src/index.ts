/**
 * Puente del comparador de precios.
 *
 * Algunas farmacias online (Farmavázquez, Farmacia Senante) están tras
 * Cloudflare y responden 403 a las peticiones que salen de los servidores de
 * Vercel (centro de datos); desde aquí responden bien (comprobado 25-11-2026).
 * El backoffice le manda UNA petición (sin seguir redirecciones: las sigue el
 * propio backoffice, que guarda las cookies) y el puente devuelve la respuesta
 * tal cual.
 *
 * Seguridad: solo con la clave secreta (Bearer), solo https y solo a los
 * dominios de PERMITIDOS, solo GET y solo cabeceras de navegador.
 */

interface Env {
  CLAVE: string;
}

const PERMITIDOS = ['farmavazquez.com', 'farma-vazquez.com', 'farmaciasenante.com'];
const CABECERAS = ['user-agent', 'accept', 'accept-language', 'cookie', 'origin', 'referer', 'x-requested-with'];
const TIMEOUT_MS = 12_000;
const MAX_BYTES = 4 * 1024 * 1024;

function iguales(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i]! ^ y[i]!;
  return d === 0;
}

const error = (status: number, mensaje: string) => Response.json({ error: mensaje }, { status });

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method !== 'POST' || new URL(req.url).pathname !== '/pedir') return error(404, 'No existe');
    const clave = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!env.CLAVE || !clave || !iguales(clave, env.CLAVE)) return error(401, 'Sin permiso');

    let datos: { url?: unknown; headers?: unknown };
    try {
      datos = await req.json();
    } catch {
      return error(400, 'Petición no válida');
    }
    let destino: URL;
    try {
      destino = new URL(String(datos.url));
    } catch {
      return error(400, 'URL no válida');
    }
    const host = destino.hostname;
    if (destino.protocol !== 'https:' || !PERMITIDOS.some((d) => host === d || host.endsWith(`.${d}`))) {
      return error(403, 'Dominio no permitido');
    }

    const cabeceras = new Headers();
    const pedidas = (datos.headers && typeof datos.headers === 'object' ? datos.headers : {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(pedidas)) {
      if (CABECERAS.includes(k.toLowerCase()) && typeof v === 'string') cabeceras.set(k, v);
    }

    try {
      const r = await fetch(destino.toString(), { headers: cabeceras, redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
      const texto = await r.text();
      if (texto.length > MAX_BYTES) return error(502, 'Respuesta demasiado grande');
      return Response.json({
        status: r.status,
        location: r.headers.get('location'),
        // getSetCookie existe en el runtime (compatibility_date reciente), aún no en los tipos.
        setCookie: (r.headers as Headers & { getSetCookie(): string[] }).getSetCookie(),
        body: texto,
      });
    } catch (e) {
      // Solo el motivo y el dominio (nunca la clave ni las cookies).
      console.error('[puente] fallo al pedir', { host, motivo: (e as Error).message });
      return error(502, 'La farmacia no responde');
    }
  },
};
