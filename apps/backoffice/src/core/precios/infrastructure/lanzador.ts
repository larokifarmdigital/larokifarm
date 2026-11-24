// Avisa a GitHub Actions para que procese una ejecución (workflow_dispatch).
// Token de GitHub de permisos mínimos (solo "Actions: write" en este repo) en
// GITHUB_DISPATCH_TOKEN; nunca en el código. Sin token (local) la ejecución
// se queda en cola y se procesa a mano: `pnpm --filter backoffice precios:lista <id>`.

export type Lanzamiento = 'lanzada' | 'sin_configurar' | 'error';

const WORKFLOW = 'precios-lista.yml';

export async function lanzarEjecucion(runId: string): Promise<Lanzamiento> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_DISPATCH_REPO || 'larokifarmdigital/larokifarm';
  if (!token) return 'sin_configurar';
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ ref: process.env.GITHUB_DISPATCH_REF || 'main', inputs: { run_id: runId } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 204) return 'lanzada';
    console.error('[precios] GitHub no lanzó el workflow', res.status);
    return 'error';
  } catch (e) {
    console.error('[precios] GitHub no responde', (e as Error).name);
    return 'error';
  }
}
