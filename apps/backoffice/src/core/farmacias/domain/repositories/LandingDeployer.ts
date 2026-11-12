/**
 * Port: lanza el rebuild de la(s) landing(s) de una farmacia (SSG) para que
 * lo publicado en el backoffice llegue a la web.
 */
export type LandingDeployResult =
  | { status: 'triggered'; total: number; failed: number }
  | { status: 'not-configured' };

export interface LandingDeployer {
  trigger(slug: string): Promise<LandingDeployResult>;
}
