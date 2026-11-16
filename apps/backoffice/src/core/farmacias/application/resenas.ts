import { READ_ONLY_ERROR, canEditContent, getCurrentUser } from '@/core/auth';
import type { ResenaRepository } from '../domain';

type VoidResult = { ok: true } | { ok: false; error: string };

/**
 * Switch por reseña del editor: mostrarla u ocultarla en la web.
 * Mismas reglas que el resto de escrituras: sesión, rol con escritura
 * (USER = solo lectura) y solo reseñas de la farmacia del usuario.
 */
export class SetResenaVisibleUseCase {
  constructor(private readonly resenas: ResenaRepository) {}

  async execute(businessId: string, resenaId: string, visible: boolean): Promise<VoidResult> {
    if (typeof businessId !== 'string' || typeof resenaId !== 'string' || typeof visible !== 'boolean') {
      return { ok: false, error: 'Datos inválidos' };
    }
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: 'Sesión requerida' };
    if (!canEditContent(user)) return { ok: false, error: READ_ONLY_ERROR };
    if (user.rol !== 'admin' && user.farmaciaId !== businessId) return { ok: false, error: 'Acceso denegado al negocio' };

    const owner = await this.resenas.findBusinessId(resenaId);
    if (!owner) return { ok: false, error: 'Reseña no encontrada' };
    if (owner !== businessId) return { ok: false, error: 'Reseña de otro negocio' };

    await this.resenas.setOculta(resenaId, !visible);
    return { ok: true };
  }
}
