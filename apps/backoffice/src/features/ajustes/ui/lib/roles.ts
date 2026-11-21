import type { RolCuenta } from '@/core/users/domain';
import { ROL_LABEL } from '@/features/shell/ui/lib/navConfig';

/** Mismas etiquetas que el menú del avatar (ROL_LABEL). */
export const ETIQUETA_ROL: Record<RolCuenta, string> = ROL_LABEL;

export const DESCRIPCION_ROL: Record<RolCuenta, string> = {
  manager: 'Edita la web de su farmacia y comprueba sus albaranes.',
  viewer: 'Ve la web de su farmacia sin poder cambiarla y comprueba sus albaranes.',
  admin: 'Gestiona todas las farmacias y los usuarios. Dáselo solo a quien lo necesite.',
};
