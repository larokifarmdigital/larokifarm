/**
 * Acceso a variables de entorno / secrets.
 *
 * Histórico: la app corría sobre Cloudflare Workers (OpenNext), donde las vars
 * llegan por el binding del request. A partir de la Fase 1 del plan multi-tenant
 * (ver docs/FASES.md) la app se despliega en Node sobre un VPS, así que las
 * vars se leen directamente de `process.env`.
 *
 * Se conserva la lectura asíncrona para minimizar el diff en los call-sites
 * existentes (ReconcilerView, route handlers).
 */
export interface AppEnv {
  // App
  AUTH_SECRET?: string;
  GEMINI_API_KEY?: string;

  // Base de datos (Fase 1)
  DATABASE_URL?: string;
  DIRECT_DATABASE_URL?: string;

  // Seed (Fase 1)
  SEED_SUPER_ADMIN_EMAIL?: string;
  SEED_SUPER_ADMIN_PASSWORD?: string;
  SEED_SUPER_ADMIN_NAME?: string;

  // Fase 2 — cifrado BYOK + storage
  ENCRYPTION_KEY?: string;
  STORAGE_DRIVER?: 'local' | 'spaces';
  STORAGE_LOCAL_DIR?: string;

  // Fase 2 (driver spaces, no usado en dev)
  SPACES_ENDPOINT?: string;
  SPACES_KEY?: string;
  SPACES_SECRET?: string;
  SPACES_BUCKET?: string;

  // Legacy (se elimina al terminar Fase 1; sustituido por login con Auth.js)
  ACCESO_CLAVE?: string;
}

export async function getEnv(): Promise<AppEnv> {
  return {
    AUTH_SECRET: process.env.AUTH_SECRET,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
    SEED_SUPER_ADMIN_EMAIL: process.env.SEED_SUPER_ADMIN_EMAIL,
    SEED_SUPER_ADMIN_PASSWORD: process.env.SEED_SUPER_ADMIN_PASSWORD,
    SEED_SUPER_ADMIN_NAME: process.env.SEED_SUPER_ADMIN_NAME,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER as 'local' | 'spaces' | undefined,
    STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR,
    SPACES_ENDPOINT: process.env.SPACES_ENDPOINT,
    SPACES_KEY: process.env.SPACES_KEY,
    SPACES_SECRET: process.env.SPACES_SECRET,
    SPACES_BUCKET: process.env.SPACES_BUCKET,
    ACCESO_CLAVE: process.env.ACCESO_CLAVE,
  };
}
