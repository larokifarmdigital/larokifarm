import type { LandingDeployer, LandingDeployResult } from '../domain';

/**
 * Deploy hooks por farmacia vía env: `DEPLOY_HOOKS_<SLUG>` con N URLs separadas
 * por coma (ej. Torrents: Cloudflare Pages + Vercel del cliente). El slug va en
 * mayúsculas y lo que no sea letra/número pasa a `_`
 * (`farmacia-sol` → `DEPLOY_HOOKS_FARMACIA_SOL`).
 *
 * Los hooks son `POST` sin auth (CF Pages, Vercel, Netlify): la URL ES el
 * secreto, por eso viven en env y nunca en la BD ni en logs.
 */
export function deployHooksEnvName(slug: string): string {
  return `DEPLOY_HOOKS_${slug.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}

const TIMEOUT_MS = 10_000;

export const landingDeployerHttp: LandingDeployer = {
  async trigger(slug): Promise<LandingDeployResult> {
    const hooks = (process.env[deployHooksEnvName(slug)] ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (hooks.length === 0) return { status: 'not-configured' };

    const results = await Promise.allSettled(
      hooks.map((url) => fetch(url, { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS) })),
    );
    const failed = results.filter((r, i) => {
      const ok = r.status === 'fulfilled' && r.value.ok;
      if (!ok) {
        const host = URL.canParse(hooks[i]) ? new URL(hooks[i]).host : 'url inválida';
        const why = r.status === 'fulfilled' ? `HTTP ${r.value.status}` : String(r.reason);
        console.error(`[deploy] ${slug}: hook ${i + 1} (${host}) falló: ${why}`);
      }
      return !ok;
    }).length;
    return { status: 'triggered', total: hooks.length, failed };
  },
};
