import { toast } from 'sonner';
import type { PublishFarmaciaResult } from '@/features/farmacias/actions/farmaciaActions';

/**
 * Toast tras publicar según cómo fue el rebuild de la landing.
 * Lanza si la publicación falló, para que el caller muestre su error.
 */
export function publishToast(res: PublishFarmaciaResult, okTitle: string, extra?: string) {
  if (!res.ok) throw new Error(res.error);
  const d = res.deploy;
  if (d?.status === 'triggered' && d.failed === d.total) {
    toast.warning(okTitle, {
      description: 'No se pudo actualizar la web. Vuelve a publicar en unos minutos.',
    });
  } else if (d?.status === 'triggered' && d.failed > 0) {
    toast.warning(okTitle, {
      description: `La web se está actualizando, pero ${d.failed} de ${d.total} sitios fallaron.`,
    });
  } else if (d?.status === 'triggered') {
    toast.success(okTitle, {
      description: [extra, 'La web se actualizará en 1-2 minutos.'].filter(Boolean).join(' '),
    });
  } else {
    toast.success(okTitle, extra ? { description: extra } : undefined);
  }
}
