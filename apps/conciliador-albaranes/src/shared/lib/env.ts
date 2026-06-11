/**
 * Acceso a variables de entorno / secrets. Funciona tanto en Node (`next dev`,
 * tests) como en el runtime de Cloudflare (donde llegan por el binding del
 * request, no por `process.env` en tiempo de import).
 *
 * Por eso NO se parsea a nivel de módulo: se lee bajo demanda dentro del handler.
 */
export interface AppEnv {
  GEMINI_API_KEY?: string;
  ACCESO_CLAVE?: string;
}

export async function getEnv(): Promise<AppEnv> {
  // En Cloudflare (OpenNext) las vars vienen del contexto del request.
  try {
    const mod = await import('@opennextjs/cloudflare');
    const ctx = mod.getCloudflareContext?.();
    const cfEnv = ctx?.env as Record<string, string> | undefined;
    if (cfEnv && (cfEnv.GEMINI_API_KEY || cfEnv.ACCESO_CLAVE)) {
      return { GEMINI_API_KEY: cfEnv.GEMINI_API_KEY, ACCESO_CLAVE: cfEnv.ACCESO_CLAVE };
    }
  } catch {
    // No estamos en Cloudflare; caemos a process.env.
  }
  return {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ACCESO_CLAVE: process.env.ACCESO_CLAVE,
  };
}
