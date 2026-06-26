import { createClient, type ClientConfig, type SanityClient } from '@sanity/client';

export type CrearSanityClientOpts = {
  projectId: string;
  dataset: string;
  apiVersion?: string;
  useCdn?: boolean;
  perspective?: ClientConfig['perspective'];
};

/**
 * Fábrica del cliente Sanity con la configuración por defecto que comparten
 * todas las apps de Larokifarm (`apiVersion: '2024-10-01'`, sin CDN, perspectiva publicada).
 * Cada app pasa su `projectId` y `dataset` desde sus propias env vars.
 */
export function crearSanityClient(opts: CrearSanityClientOpts): SanityClient {
  const {
    projectId,
    dataset,
    apiVersion = '2024-10-01',
    useCdn = false,
    perspective = 'published',
  } = opts;

  return createClient({ projectId, dataset, apiVersion, useCdn, perspective });
}

export type { ClientConfig, SanityClient } from '@sanity/client';
