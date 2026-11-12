import type { SaveResult } from '@/core/shared';
import type { Farmacia, FarmaciaRepository, LandingDeployer, LandingDeployResult } from '../domain';

/**
 * Publicar = marcar `published` + rebuild de la landing (SSG: sin rebuild,
 * los cambios no llegan a la web).
 *
 * Pasar a borrador NO dispara deploy: la API pública daría 404 y el build
 * dejaría la web vacía. La versión publicada sigue online hasta que se retire
 * a mano del hosting.
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
    const res = await this.repo.publishFarmacia(id, publish ? 'published' : 'draft');
    if (!res.ok) return res;
    if (!publish) return { ok: true, data: { farmacia: res.data } };
    const deploy = await this.deployer.trigger(res.data.slug);
    return { ok: true, data: { farmacia: res.data, deploy } };
  }
}
