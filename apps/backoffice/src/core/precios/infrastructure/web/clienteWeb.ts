// Cliente HTTP para las farmacias online: navegador de escritorio, como mucho
// una petición NUEVA por segundo a cada web (y 4 abiertas a la vez como mucho,
// para que una web lenta no frene la cola), cookies por dominio y detección de
// retos anti-bot. Sin proxies ni ScraperAPI (decisión de gestión).

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const TIMEOUT_MS = 12_000;
const INTERVALO_MS = 1_100;
const MAX_ABIERTAS = 4;

export class WebBloqueaError extends Error {
  constructor(detalle: string) {
    super(`La web bloquea el acceso automático (${detalle})`);
  }
}

export interface Respuesta {
  status: number;
  url: string;
  body: string;
}

const RETO = /<title>Just a moment|cf-chl-|challenge-platform\/h\/|Client Challenge|Captcha Page/i;

export function esReto(r: Respuesta): boolean {
  return r.status === 403 || r.status === 429 || r.status === 503 || RETO.test(r.body.slice(0, 8000));
}

export interface OpcionesGet {
  accept?: 'html' | 'json' | 'any';
  headers?: Record<string, string>;
  /** Lanza WebBloqueaError si la respuesta es un reto anti-bot. Por defecto, sí. */
  detectarReto?: boolean;
}

const ACCEPT = {
  html: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  json: 'application/json, text/javascript, */*; q=0.01',
  any: '*/*',
};

export class ClienteWeb {
  /**
   * Solo se piden URLs https de estos dominios (y sus subdominios): los enlaces
   * vienen de buscadores de terceros y no deben llevar al servidor a otro sitio.
   */
  constructor(private readonly dominios: readonly string[]) {}

  private proximo = 0;
  private abiertas = 0;
  private esperando: (() => void)[] = [];
  private cookies = new Map<string, Map<string, string>>();

  /** Reserva el siguiente hueco (1 por INTERVALO_MS) y espera a que llegue. */
  private async turno() {
    const ahora = Date.now();
    const hueco = Math.max(ahora, this.proximo);
    this.proximo = hueco + INTERVALO_MS;
    if (hueco > ahora) await new Promise((r) => setTimeout(r, hueco - ahora));
  }

  /** Varias consultas a la vez no saturan la web: ritmo y abiertas limitados. */
  async get(url: string, opts: OpcionesGet = {}): Promise<Respuesta> {
    if (this.abiertas >= MAX_ABIERTAS) await new Promise<void>((r) => this.esperando.push(r));
    this.abiertas++;
    try {
      return await this.ejecutar(url, opts);
    } finally {
      this.abiertas--;
      this.esperando.shift()?.();
    }
  }

  private async ejecutar(url: string, opts: OpcionesGet): Promise<Respuesta> {
    let actual = url;
    const permitida = (u: string) => {
      const { protocol, hostname } = new URL(u);
      return protocol === 'https:' && this.dominios.some((d) => hostname === d || hostname.endsWith(`.${d}`));
    };
    // Redirecciones a mano para guardar las cookies de cada salto (retos con 307).
    for (let salto = 0; salto < 5; salto++) {
      if (!permitida(actual)) throw new Error(`URL fuera de la farmacia: ${new URL(actual).hostname}`);
      await this.turno();
      const host = new URL(actual).host;
      const jar = this.cookies.get(host) ?? new Map<string, string>();
      const res = await fetch(actual, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'user-agent': UA,
          'accept-language': 'es-ES,es;q=0.9',
          accept: ACCEPT[opts.accept ?? 'html'],
          ...(jar.size ? { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
          ...opts.headers,
        },
      });
      for (const c of res.headers.getSetCookie()) {
        const kv = c.split(';')[0];
        const i = kv.indexOf('=');
        if (i > 0) jar.set(kv.slice(0, i).trim(), kv.slice(i + 1).trim());
      }
      this.cookies.set(host, jar);
      const destino = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && destino) {
        actual = new URL(destino, actual).href;
        continue;
      }
      const r = { status: res.status, url: actual, body: await res.text() };
      if (opts.detectarReto !== false && esReto(r)) throw new WebBloqueaError(`HTTP ${r.status}`);
      return r;
    }
    throw new Error('Demasiadas redirecciones');
  }

  async json<T>(url: string, opts: Omit<OpcionesGet, 'accept'> = {}): Promise<T> {
    const r = await this.get(url, { ...opts, accept: 'json' });
    if (r.status !== 200) throw new Error(`HTTP ${r.status}`);
    return JSON.parse(r.body) as T;
  }
}
