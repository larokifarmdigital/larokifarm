import type { SaveResult } from '@/core/shared';
import { describeIssues, validateFarmacia, type Farmacia, type FarmaciaRepository, type LandingDeployer, type LandingDeployResult } from '../domain';

/**
 * Pasar a borrador NO dispara deploy: la API pública daría 404 y el build
 * dejaría la web vacía. La versión publicada sigue online hasta retirarla a mano del hosting.
 */
export class PublishFarmaciaUseCase {
  constructor(
    private readonly repo: FarmaciaRepository,
    private readonly deployer: LandingDeployer,
  ) {}

  async execute(
    id: string,
    publish: boolean,
  ): Promise<SaveResult<{ farmacia: Farmacia; deploy?: LandingDeployResult }>> {
    // Mismas reglas que el editor: no se publica con datos obligatorios
    // vacíos o con formato inválido (aunque se llame a la action directamente).
    if (publish) {
      const current = await this.repo.getFarmacia(id);
      if (!current) return { ok: false, error: 'Farmacia no encontrada' };
      const issues = validateFarmacia(current);
      if (issues.length > 0) {
        return { ok: false, error: `No se puede publicar: revisa ${describeIssues(issues)}.` };
      }
    }
    const res = await this.repo.publishFarmacia(id, publish ? 'published' : 'draft');
    if (!res.ok) return res;
    if (!publish) return { ok: true, data: { farmacia: res.data } };
    const deploy = await this.deployer.trigger(res.data.slug);
    return { ok: true, data: { farmacia: res.data, deploy } };
  }
}
