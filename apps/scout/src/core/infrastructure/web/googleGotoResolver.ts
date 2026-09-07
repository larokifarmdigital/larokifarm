/**
 * Helper para desenvolver los wrappers de redirect de Google Mobile SERP.
 *
 * Contexto: cuando ScraperAPI Google Search endpoint devuelve resultados desde
 * google.es (SERP mobile), los links vienen envueltos en:
 *
 *   https://www.google.es/goto?url=<protobuf-encoded-payload>
 *
 * El payload NO es una URL codificada — es un blob protobuf que no se puede
 * decodificar client-side. La única forma de obtener el destino real es hacer
 * GET al goto URL y extraer la URL real del body HTML (Google redirige por JS,
 * no por 3xx).
 *
 * Su único cliente es `googleWebFinder` — por eso vive aquí y no en scraper/.
 */

/** True si la URL es un wrapper de redirect de Google (goto, url, aclk). */
export function isGoogleRedirect(url: string): boolean {
  return /^https?:\/\/(?:www\.)?google\.[^/]+\/(?:goto|url|aclk)\?/i.test(url);
}

/**
 * Sigue el goto de Google Mobile para extraer la URL destino real.
 * Google devuelve 200 con HTML que contiene la URL destino en el body.
 * Buscamos la primera URL http(s) que NO sea del propio dominio de Google.
 */
export async function resolveGotoUrl(gotoUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const res = await fetch(gotoUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      },
    });

    // Si hubo 3xx explícito, aprovechamos el Location header
    const location = res.headers.get('location');
    if (location && /^https?:\/\//i.test(location) && !isGoogleRedirect(location)) {
      return location;
    }

    // Ruta normal: body 200 con la URL en el HTML — la extraemos con regex
    const body = await res.text();
    const matches = body.match(/https?:\/\/[^"'<>\s`]{15,300}/g) ?? [];
    for (const url of matches) {
      if (/^https?:\/\/[^/]*google\./i.test(url)) continue;
      if (/^https?:\/\/[^/]*gstatic\./i.test(url)) continue;
      if (/^https?:\/\/[^/]*googleusercontent\./i.test(url)) continue;
      return url;
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
